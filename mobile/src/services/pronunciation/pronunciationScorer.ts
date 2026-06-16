// ============================================================
// EnglishMitraAi - Pronunciation Scorer (FREE — 100% offline)
// Replaces: OpenAI Whisper pronunciation API (paid)
// Uses: Levenshtein distance + word matching algorithms
// Works completely offline — no API calls needed
// ============================================================

// ============================================================
// Types
// ============================================================

export interface WordScore {
  word: string
  spoken: string | null
  status: 'correct' | 'mispronounced' | 'missing' | 'extra'
  similarity: number
  tip: string
}

export interface PronunciationScore {
  overall_score: number
  accuracy_score: number
  completeness_score: number
  fluency_score: number
  words_analysis: WordScore[]
  feedback: string
  feedback_telugu: string
  encouragement: string
  transcript: string
  target_phrase: string
}

// ============================================================
// LEVENSHTEIN DISTANCE
// Measures how different two strings are
// 0 = identical, higher = more different
// ============================================================

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length

  // Create 2D DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp[m][n]
}

// ============================================================
// STRING SIMILARITY
// Returns 0.0 (no match) to 1.0 (perfect match)
// ============================================================

function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1.0
  if (!a || !b) return 0.0

  const aLower = a.toLowerCase().trim()
  const bLower = b.toLowerCase().trim()

  if (aLower === bLower) return 1.0

  const maxLen = Math.max(aLower.length, bLower.length)
  if (maxLen === 0) return 1.0

  const distance = levenshteinDistance(aLower, bLower)
  return Math.max(0, 1 - distance / maxLen)
}

// ============================================================
// PHONETIC NORMALIZATION
// Normalizes common pronunciation differences between
// Indian English and standard English
// ============================================================

function normalizeForComparison(word: string): string {
  return word
    .toLowerCase()
    .trim()
    // Common Indian English phonetic substitutions
    .replace(/ph/g, 'f')
    .replace(/tion$/g, 'shun')
    .replace(/ture$/g, 'cher')
    .replace(/ough/g, 'off')
    .replace(/wh/g, 'w')
    // Remove punctuation
    .replace(/[.,!?;:'"]/g, '')
    // Normalize double letters
    .replace(/(.)\1+/g, '$1')
}

// ============================================================
// FIND BEST WORD MATCH
// Finds the closest spoken word to a target word
// ============================================================

function findBestMatch(
  targetWord: string,
  spokenWords: string[]
): { match: string | null; similarity: number; index: number } {
  let bestSimilarity = 0
  let bestMatch: string | null = null
  let bestIndex = -1

  const normalizedTarget = normalizeForComparison(targetWord)

  spokenWords.forEach((spoken, idx) => {
    const normalizedSpoken = normalizeForComparison(spoken)

    // Check both raw and normalized similarity
    const rawSim = stringSimilarity(targetWord.toLowerCase(), spoken.toLowerCase())
    const normSim = stringSimilarity(normalizedTarget, normalizedSpoken)
    const similarity = Math.max(rawSim, normSim)

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      bestMatch = spoken
      bestIndex = idx
    }
  })

  return { match: bestMatch, similarity: bestSimilarity, index: bestIndex }
}

// ============================================================
// WORD-LEVEL ANALYSIS
// Compares each target word against spoken words
// ============================================================

function analyzeWords(targetWords: string[], spokenWords: string[]): WordScore[] {
  const scores: WordScore[] = []
  const usedIndices = new Set<number>()

  for (const targetWord of targetWords) {
    const availableSpoken = spokenWords.filter((_, i) => !usedIndices.has(i))
    const { match, similarity, index } = findBestMatch(targetWord, availableSpoken)

    // Find original index in spokenWords
    const originalIndex = spokenWords.findIndex(
      (w, i) => w === match && !usedIndices.has(i)
    )

    let status: WordScore['status']
    let tip: string

    if (similarity >= 0.9) {
      status = 'correct'
      tip = '✓ Well pronounced!'
      if (originalIndex >= 0) usedIndices.add(originalIndex)
    } else if (similarity >= 0.6) {
      status = 'mispronounced'
      tip = generatePronunciationTip(targetWord, match || '')
      if (originalIndex >= 0) usedIndices.add(originalIndex)
    } else {
      status = 'missing'
      tip = `Try to say: "${targetWord}"`
    }

    scores.push({
      word: targetWord,
      spoken: match,
      status,
      similarity: Math.round(similarity * 100),
      tip,
    })
  }

  // Find extra words (spoken but not in target)
  spokenWords.forEach((spoken, idx) => {
    if (!usedIndices.has(idx)) {
      scores.push({
        word: spoken,
        spoken,
        status: 'extra',
        similarity: 0,
        tip: `"${spoken}" was not in the target phrase`,
      })
    }
  })

  return scores
}

// ============================================================
// PRONUNCIATION TIP GENERATOR
// Gives specific tips for common Telugu→English errors
// ============================================================

function generatePronunciationTip(targetWord: string, spokenWord: string): string {
  const target = targetWord.toLowerCase()
  const spoken = spokenWord.toLowerCase()

  // Common Telugu accent patterns to address
  if (target.includes('th') && !spoken.includes('th')) {
    return `"${targetWord}" has the "th" sound — put your tongue between your teeth`
  }
  if (target.endsWith('ed') && !spoken.endsWith('ed')) {
    return `"${targetWord}" ends with "-ed" sound (past tense)`
  }
  if (target.includes('w') && spoken.includes('v')) {
    return `Say "W" not "V" in "${targetWord}" — round your lips`
  }
  if (target.includes('v') && spoken.includes('b')) {
    return `Say "V" not "B" in "${targetWord}" — touch upper teeth to lower lip`
  }
  if (target.endsWith('ing') && !spoken.endsWith('ing')) {
    return `Don't forget the "-ing" ending in "${targetWord}"`
  }
  if (levenshteinDistance(target, spoken) <= 2) {
    return `Almost correct! Pay attention to the exact sounds in "${targetWord}"`
  }

  return `Practice saying "${targetWord}" slowly, syllable by syllable`
}

// ============================================================
// CALCULATE SCORES
// ============================================================

function calculateScores(wordScores: WordScore[], targetLength: number): {
  accuracy: number
  completeness: number
  fluency: number
} {
  const correctCount = wordScores.filter(w => w.status === 'correct').length
  const mispronounced = wordScores.filter(w => w.status === 'mispronounced').length
  const missing = wordScores.filter(w => w.status === 'missing').length
  const extra = wordScores.filter(w => w.status === 'extra').length

  // Accuracy: how well the spoken words match
  const accuracy = targetLength > 0
    ? Math.round(((correctCount + mispronounced * 0.5) / targetLength) * 100)
    : 0

  // Completeness: how many target words were said
  const completeness = targetLength > 0
    ? Math.round(((targetLength - missing) / targetLength) * 100)
    : 0

  // Fluency: penalizes for extra words and major errors
  const fluencyPenalty = (missing * 10) + (extra * 5) + (mispronounced * 3)
  const fluency = Math.max(0, Math.min(100, 100 - fluencyPenalty))

  return {
    accuracy: Math.min(100, Math.max(0, accuracy)),
    completeness: Math.min(100, Math.max(0, completeness)),
    fluency: Math.min(100, Math.max(0, fluency)),
  }
}

// ============================================================
// FEEDBACK GENERATOR
// ============================================================

function generateFeedback(
  overallScore: number,
  wordScores: WordScore[],
  targetPhrase: string
): { feedback: string; feedback_telugu: string; encouragement: string } {
  const correctWords = wordScores.filter(w => w.status === 'correct').map(w => w.word)
  const mispronouncedWords = wordScores.filter(w => w.status === 'mispronounced').map(w => w.word)
  const missingWords = wordScores.filter(w => w.status === 'missing').map(w => w.word)

  let feedback: string
  let feedback_telugu: string
  let encouragement: string

  if (overallScore >= 90) {
    feedback = `Excellent pronunciation! Your delivery of "${targetPhrase}" was near-perfect.`
    feedback_telugu = `అద్భుతమైన ఉచ్చారణ! మీరు చాలా బాగా చెప్పారు.`
    encouragement = `🌟 మీరు నిజంగా గొప్పగా చెప్పారు! మీ ఉచ్చారణ చాలా బాగుంది!`
  } else if (overallScore >= 75) {
    feedback = `Good job! ${correctWords.length > 0 ? `"${correctWords.join('", "')}" sounded great. ` : ''}${mispronouncedWords.length > 0 ? `Focus on improving "${mispronouncedWords.join('", "')}" a little more.` : ''}`
    feedback_telugu = `బాగుంది! ${mispronouncedWords.length > 0 ? `"${mispronouncedWords.join('", "')}" కొంచెం మెరుగుపరచాలి.` : 'మంచి ప్రయత్నం!'}`
    encouragement = `👍 మీరు చాలా మంచి పనిచేస్తున్నారు! కొంచెం మరింత అభ్యాసం చేయండి.`
  } else if (overallScore >= 55) {
    feedback = `Decent attempt! ${missingWords.length > 0 ? `Try not to skip words like "${missingWords.join('", "')}". ` : ''}Practice the full phrase slowly first.`
    feedback_telugu = `మంచి ప్రయత్నం! మొత్తం వాక్యాన్ని నెమ్మదిగా అభ్యాసం చేయండి.`
    encouragement = `💪 నిరుత్సాహపడకండి! రోజూ అభ్యాసం చేస్తే తప్పకుండా మెరుగుపడతారు!`
  } else {
    feedback = `Keep practicing! Listen to the model pronunciation first, then try repeating it slowly word by word.`
    feedback_telugu = `మళ్ళీ ప్రయత్నించండి! ముందు నమూనా ఉచ్చారణ వినండి, తర్వాత నెమ్మదిగా చెప్పండి.`
    encouragement = `🌱 మొదలు కష్టంగా అనిపిస్తుంది, కానీ రోజూ 10 నిమిషాలు అభ్యాసం చేస్తే తప్పకుండా నేర్చుకుంటారు!`
  }

  return { feedback, feedback_telugu, encouragement }
}

// ============================================================
// MAIN SCORING FUNCTION
// Call this with the transcript from speech recognition
// and the target phrase the user was supposed to say
// ============================================================

export function scorePronunciation(
  transcript: string,
  targetPhrase: string
): PronunciationScore {
  // Normalize inputs
  const cleanTranscript = transcript.trim()
  const cleanTarget = targetPhrase.trim()

  // Tokenize into words (remove punctuation, lowercase)
  const spokenWords = cleanTranscript
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)

  const targetWords = cleanTarget
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)

  if (targetWords.length === 0) {
    return {
      overall_score: 0,
      accuracy_score: 0,
      completeness_score: 0,
      fluency_score: 0,
      words_analysis: [],
      feedback: 'No target phrase provided.',
      feedback_telugu: 'లక్ష్య వాక్యం లేదు.',
      encouragement: 'దయచేసి మళ్ళీ ప్రయత్నించండి.',
      transcript: cleanTranscript,
      target_phrase: cleanTarget,
    }
  }

  if (spokenWords.length === 0) {
    return {
      overall_score: 0,
      accuracy_score: 0,
      completeness_score: 0,
      fluency_score: 0,
      words_analysis: targetWords.map(w => ({
        word: w, spoken: null, status: 'missing' as const,
        similarity: 0, tip: `Say: "${w}"`,
      })),
      feedback: 'No speech detected. Please try again and speak clearly.',
      feedback_telugu: 'మాట్లాడిన మాటలు వినిపించలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
      encouragement: 'మైక్ దగ్గరగా పట్టుకోండి మరియు స్పష్టంగా మాట్లాడండి.',
      transcript: cleanTranscript,
      target_phrase: cleanTarget,
    }
  }

  // Word-level analysis
  const wordScores = analyzeWords(targetWords, spokenWords)

  // Calculate sub-scores
  const { accuracy, completeness, fluency } = calculateScores(wordScores, targetWords.length)

  // Overall: weighted average (accuracy matters most)
  const overall = Math.round(accuracy * 0.50 + completeness * 0.30 + fluency * 0.20)

  // Generate human feedback
  const { feedback, feedback_telugu, encouragement } = generateFeedback(overall, wordScores, cleanTarget)

  return {
    overall_score: Math.min(100, Math.max(0, overall)),
    accuracy_score: accuracy,
    completeness_score: completeness,
    fluency_score: fluency,
    words_analysis: wordScores,
    feedback,
    feedback_telugu,
    encouragement,
    transcript: cleanTranscript,
    target_phrase: cleanTarget,
  }
}

// ============================================================
// SIMILARITY SCORE (quick check — no full analysis)
// Returns 0-100 score for how close transcript is to target
// ============================================================

export function quickSimilarityScore(transcript: string, target: string): number {
  const sim = stringSimilarity(
    normalizeForComparison(transcript),
    normalizeForComparison(target)
  )
  return Math.round(sim * 100)
}

// ============================================================
// PHONEME DIFFICULTY DETECTOR
// Identifies which sounds Telugu speakers typically struggle with
// ============================================================

export interface PhonemeChallenge {
  phoneme: string
  example_words: string[]
  tip_english: string
  tip_telugu: string
}

export const TELUGU_PRONUNCIATION_CHALLENGES: PhonemeChallenge[] = [
  {
    phoneme: 'th',
    example_words: ['the', 'this', 'think', 'three', 'that', 'there'],
    tip_english: 'Place your tongue between your upper and lower teeth. Blow air gently.',
    tip_telugu: 'నాలుకను పైపళ్ళు మరియు కింది పళ్ళ మధ్య పెట్టి గాలి వదలండి.',
  },
  {
    phoneme: 'w vs v',
    example_words: ['water', 'word', 'work', 'want', 'where'],
    tip_english: 'For "W", round your lips like a circle. Do NOT use your teeth.',
    tip_telugu: '"W" కి పెదవులను గుండ్రంగా చేయండి. పళ్ళు వాడకండి.',
  },
  {
    phoneme: 'v vs b',
    example_words: ['very', 'voice', 'value', 'video'],
    tip_english: 'For "V", touch your upper teeth to your lower lip.',
    tip_telugu: '"V" కి పైపళ్ళను క్రింది పెదవికి తాకించండి.',
  },
  {
    phoneme: 'short u',
    example_words: ['but', 'cup', 'cut', 'bus', 'fun'],
    tip_english: 'Short "u" sounds like "uh" — not like "oo".',
    tip_telugu: '"u" చిన్న శబ్దం "అ" లాగా ఉంటుంది.',
  },
  {
    phoneme: 'final consonants',
    example_words: ['sit', 'stop', 'like', 'make', 'help'],
    tip_english: 'Do not add an "u" sound at the end of words (no "situ", "stopu").',
    tip_telugu: 'పదాల చివర "u" శబ్దం వేయకండి.',
  },
]

export function detectPhonemeIssues(targetWord: string, spokenWord: string): PhonemeChallenge[] {
  const target = targetWord.toLowerCase()
  const challenges: PhonemeChallenge[] = []

  for (const challenge of TELUGU_PRONUNCIATION_CHALLENGES) {
    if (challenge.phoneme === 'th' && target.includes('th')) {
      if (!spokenWord.toLowerCase().includes('th')) {
        challenges.push(challenge)
      }
    }
    if (challenge.phoneme === 'w vs v' && target.includes('w')) {
      if (spokenWord.toLowerCase().includes('v') && !target.includes('v')) {
        challenges.push(challenge)
      }
    }
    if (challenge.phoneme === 'final consonants') {
      if (spokenWord.length > target.length + 1) {
        challenges.push(challenge)
      }
    }
  }

  return challenges
}
