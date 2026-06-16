// ============================================================
// EnglishMitraAi - Update User Progress & Gamification
// Handles: XP, streaks, achievements, leaderboard
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProgressUpdate {
  action: 'complete_lesson' | 'complete_quiz' | 'daily_checkin' | 'complete_challenge'
  lesson_id?: string
  quiz_attempt_id?: string
  challenge_id?: string
  score?: number
  xp_amount?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Service role for admin operations
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: ProgressUpdate = await req.json()
    const { action, lesson_id, xp_amount = 0 } = body

    // Fetch current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const today = new Date().toISOString().split('T')[0]
    const lastActive = profile.last_active_date
    const newAchievements: string[] = []
    let xpEarned = xp_amount

    // ---- STREAK LOGIC ----
    let newStreak = profile.streak_current
    let streakUpdated = false

    if (lastActive !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (lastActive === yesterdayStr) {
        // Consecutive day - increment streak
        newStreak = profile.streak_current + 1
        streakUpdated = true
        // Streak bonus XP
        if (newStreak % 7 === 0) xpEarned += 50 // weekly bonus
        else xpEarned += 5
      } else if (lastActive !== today) {
        // Streak broken
        newStreak = 1
        streakUpdated = true
      }
    }

    // ---- LESSON COMPLETION ----
    if (action === 'complete_lesson' && lesson_id) {
      const { data: lesson } = await supabase
        .from('lessons')
        .select('xp_reward')
        .eq('id', lesson_id)
        .single()

      if (lesson) xpEarned += lesson.xp_reward

      await supabase.from('user_lesson_progress').upsert({
        user_id: user.id,
        lesson_id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' })
    }

    // ---- UPDATE PROFILE ----
    const newXpTotal = profile.xp_total + xpEarned
    const newXpToday = profile.last_active_date === today
      ? profile.xp_today + xpEarned
      : xpEarned

    const newLevel = calculateLevel(newXpTotal)

    await supabase.from('profiles').update({
      xp_total: newXpTotal,
      xp_today: newXpToday,
      streak_current: newStreak,
      streak_longest: Math.max(profile.streak_longest, newStreak),
      last_active_date: today,
      current_level: newLevel,
    }).eq('id', user.id)

    // ---- RECORD XP TRANSACTION ----
    if (xpEarned > 0) {
      await supabase.from('xp_transactions').insert({
        user_id: user.id,
        amount: xpEarned,
        source: action === 'complete_lesson' ? 'lesson'
          : action === 'complete_quiz' ? 'quiz'
          : action === 'daily_checkin' ? 'streak_bonus'
          : 'daily_challenge',
        reference_id: lesson_id || null,
        description: `${action} reward`,
      })
    }

    // ---- CHECK ACHIEVEMENTS ----
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)

    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id)

    const earnedIds = new Set((userAchievements || []).map(a => a.achievement_id))

    // Count stats for achievement check
    const { count: lessonsCount } = await supabase
      .from('user_lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const { count: quizzesCount } = await supabase
      .from('user_quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('passed', true)

    const { count: chatsCount } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    for (const achievement of allAchievements || []) {
      if (earnedIds.has(achievement.id)) continue

      let earned = false
      switch (achievement.requirement_type) {
        case 'xp': earned = newXpTotal >= achievement.requirement_value; break
        case 'streak': earned = newStreak >= achievement.requirement_value; break
        case 'lessons_completed': earned = (lessonsCount || 0) >= achievement.requirement_value; break
        case 'quizzes_passed': earned = (quizzesCount || 0) >= achievement.requirement_value; break
        case 'chat_sessions': earned = (chatsCount || 0) >= achievement.requirement_value; break
      }

      if (earned) {
        await supabase.from('user_achievements').insert({
          user_id: user.id,
          achievement_id: achievement.id,
        })
        // Award achievement XP bonus
        await supabase.from('profiles').update({
          xp_total: newXpTotal + achievement.xp_reward,
        }).eq('id', user.id)
        newAchievements.push(achievement.id)
      }
    }

    // ---- UPDATE WEEKLY LEADERBOARD ----
    const weekStart = getWeekStart()
    await supabase.from('leaderboard_weekly').upsert({
      user_id: user.id,
      week_start: weekStart,
      xp_earned: supabase.rpc('increment_leaderboard', { uid: user.id, wk: weekStart, amt: xpEarned }),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' })

    return new Response(
      JSON.stringify({
        xp_earned: xpEarned,
        new_xp_total: newXpTotal,
        new_level: newLevel,
        level_up: newLevel > profile.current_level,
        streak: newStreak,
        streak_updated: streakUpdated,
        new_achievements: newAchievements,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Progress update error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateLevel(xp: number): number {
  // Level thresholds: 1=0, 2=100, 3=250, 4=500, 5=1000, 6=2000...
  const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000]
  let level = 1
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) { level = i + 1; break }
  }
  return Math.min(level, 10)
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}
