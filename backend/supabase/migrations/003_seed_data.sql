-- ============================================================
-- EnglishMitraAi - Seed Data
-- ============================================================

-- ============================================================
-- LESSON CATEGORIES (10 categories)
-- ============================================================

INSERT INTO lesson_categories (name, name_telugu, description, description_telugu, icon_name, color_hex, sort_order) VALUES
('Daily Conversations', 'రోజువారీ సంభాషణలు', 'Essential phrases for everyday life', 'రోజువారీ జీవితానికి అవసరమైన వాక్యాలు', 'chat', '#4F46E5', 1),
('Office & Work', 'కార్యాలయం & పని', 'Professional English for the workplace', 'కార్యాలయంలో వృత్తిపరమైన ఇంగ్లీష్', 'briefcase', '#0891B2', 2),
('Shopping & Market', 'షాపింగ్ & మార్కెట్', 'English for shopping and bargaining', 'షాపింగ్ మరియు బేరమాడటానికి ఇంగ్లీష్', 'shopping-cart', '#059669', 3),
('Travel & Transport', 'ప్రయాణం & రవాణా', 'Navigate trains, buses and airports', 'రైళ్లు, బస్సులు మరియు విమానాశ్రయాలలో ప్రయాణం', 'airplane', '#DC2626', 4),
('Health & Hospital', 'ఆరోగ్యం & ఆసుపత్రి', 'Medical vocabulary and doctor visits', 'వైద్య పదజాలం మరియు డాక్టర్ దగ్గరికి వెళ్ళడం', 'heart', '#DB2777', 5),
('Education & School', 'విద్య & పాఠశాల', 'Academic English for students', 'విద్యార్థులకు విద్యాసంబంధ ఇంగ్లీష్', 'book-open', '#7C3AED', 6),
('Food & Restaurant', 'భోజనం & రెస్టారెంట్', 'Order food and discuss cuisine', 'భోజనం ఆర్డర్ చేయడం మరియు వంటకాల గురించి మాట్లాడటం', 'utensils', '#D97706', 7),
('Technology & Internet', 'టెక్నాలజీ & ఇంటర్నెట్', 'Modern tech vocabulary and usage', 'ఆధునిక సాంకేతిక పదజాలం మరియు వినియోగం', 'smartphone', '#0F766E', 8),
('Family & Relationships', 'కుటుంబం & సంబంధాలు', 'Talk about family and social life', 'కుటుంబం మరియు సామాజిక జీవితం గురించి మాట్లాడటం', 'users', '#BE185D', 9),
('Grammar Foundations', 'వ్యాకరణ పునాదులు', 'Core English grammar rules', 'ప్రాథమిక ఇంగ్లీష్ వ్యాకరణ నియమాలు', 'pen-tool', '#1D4ED8', 10);

-- ============================================================
-- SAMPLE LESSONS (per category)
-- ============================================================

-- Daily Conversations Lessons
INSERT INTO lessons (category_id, title, title_telugu, description, description_telugu, difficulty_level, xp_reward, estimated_minutes, sort_order, content) VALUES
(
  (SELECT id FROM lesson_categories WHERE name = 'Daily Conversations' LIMIT 1),
  'Greetings & Introductions',
  'నమస్కారాలు & పరిచయాలు',
  'Learn how to greet people and introduce yourself in English',
  'ఇంగ్లీష్‌లో ప్రజలకు శుభాకాంక్షలు తెలిపి మిమ్మల్ని మీరు పరిచయం చేసుకోవడం నేర్చుకోండి',
  1, 15, 10, 1,
  '{
    "vocabulary": [
      {"word": "Hello", "telugu": "హలో", "phonetic": "heh-loh", "example": "Hello, my name is Ravi."},
      {"word": "Good morning", "telugu": "శుభోదయం", "phonetic": "good mor-ning", "example": "Good morning! How are you?"},
      {"word": "Nice to meet you", "telugu": "మీతో పరిచయం అయినందుకు సంతోషం", "phonetic": "nys too meet yoo", "example": "Nice to meet you, I am from Hyderabad."},
      {"word": "My name is", "telugu": "నా పేరు", "phonetic": "my naym iz", "example": "My name is Priya."},
      {"word": "I am from", "telugu": "నేను ... నుండి వచ్చాను", "phonetic": "I am from", "example": "I am from Vijayawada."}
    ],
    "dialogues": [
      {
        "title": "First Meeting",
        "lines": [
          {"speaker": "A", "text": "Hello! My name is Arjun. What is your name?", "telugu": "హలో! నా పేరు అర్జున్. మీ పేరు ఏమిటి?"},
          {"speaker": "B", "text": "Hi Arjun! I am Sunitha. Nice to meet you.", "telugu": "హాయ్ అర్జున్! నేను సునీత. మీతో పరిచయం అయినందుకు సంతోషం."},
          {"speaker": "A", "text": "Nice to meet you too, Sunitha. Where are you from?", "telugu": "నాకు కూడా సంతోషంగా ఉంది సునీత. మీరు ఎక్కడ నుండి వచ్చారు?"},
          {"speaker": "B", "text": "I am from Guntur. And you?", "telugu": "నేను గుంటూరు నుండి వచ్చాను. మీరు?"},
          {"speaker": "A", "text": "I am from Warangal. I work at a software company here in Hyderabad.", "telugu": "నేను వరంగల్ నుండి వచ్చాను. నేను ఇక్కడ హైదరాబాద్‌లో సాఫ్ట్‌వేర్ కంపెనీలో పని చేస్తున్నాను."}
        ]
      }
    ],
    "tips": [
      {"tip": "Always smile when greeting someone", "tip_telugu": "ఎవరినైనా పలకరించేటప్పుడు ఎల్లప్పుడూ నవ్వండి"},
      {"tip": "Use 'sir' or 'madam' for elders", "tip_telugu": "పెద్దవారికి 'sir' లేదా 'madam' ఉపయోగించండి"}
    ]
  }'
),
(
  (SELECT id FROM lesson_categories WHERE name = 'Daily Conversations' LIMIT 1),
  'Asking for Directions',
  'దారి అడగడం',
  'Learn how to ask and give directions in English',
  'ఇంగ్లీష్‌లో దారి అడగడం మరియు చెప్పడం నేర్చుకోండి',
  2, 20, 12, 2,
  '{
    "vocabulary": [
      {"word": "Where is", "telugu": "ఎక్కడ ఉంది", "phonetic": "wer iz", "example": "Where is the nearest bus stop?"},
      {"word": "Turn left", "telugu": "ఎడమవైపు తిరగండి", "phonetic": "turn left", "example": "Turn left at the signal."},
      {"word": "Turn right", "telugu": "కుడివైపు తిరగండి", "phonetic": "turn ryt", "example": "Turn right after the temple."},
      {"word": "Straight ahead", "telugu": "నేరుగా వెళ్ళండి", "phonetic": "strayt ah-hed", "example": "Go straight ahead for 500 meters."},
      {"word": "How far is it?", "telugu": "అది ఎంత దూరం?", "phonetic": "how far iz it", "example": "Excuse me, how far is it to the railway station?"}
    ],
    "dialogues": [
      {
        "title": "Finding the Hospital",
        "lines": [
          {"speaker": "A", "text": "Excuse me, can you help me? I am looking for Gandhi Hospital.", "telugu": "క్షమించండి, మీరు నాకు సహాయం చేయగలరా? నేను గాంధీ ఆసుపత్రి వెతుకుతున్నాను."},
          {"speaker": "B", "text": "Yes, of course! Go straight ahead and turn left at the traffic light.", "telugu": "అవును, తప్పకుండా! నేరుగా వెళ్ళి ట్రాఫిక్ లైట్ వద్ద ఎడమవైపు తిరగండి."},
          {"speaker": "A", "text": "Is it far from here?", "telugu": "అది ఇక్కడ నుండి దూరంగా ఉందా?"},
          {"speaker": "B", "text": "No, it is only about 10 minutes walking distance.", "telugu": "లేదు, అది నడిచి కేవలం 10 నిమిషాల దూరం మాత్రమే."},
          {"speaker": "A", "text": "Thank you so much!", "telugu": "చాలా ధన్యవాదాలు!"}
        ]
      }
    ],
    "tips": []
  }'
);

-- Office & Work Lessons
INSERT INTO lessons (category_id, title, title_telugu, description, description_telugu, difficulty_level, xp_reward, estimated_minutes, sort_order, content) VALUES
(
  (SELECT id FROM lesson_categories WHERE name = 'Office & Work' LIMIT 1),
  'Job Interview English',
  'జాబ్ ఇంటర్వ్యూ ఇంగ్లీష్',
  'Master common interview questions and professional answers',
  'సాధారణ ఇంటర్వ్యూ ప్రశ్నలు మరియు వృత్తిపరమైన సమాధానాలు నేర్చుకోండి',
  3, 30, 20, 1,
  '{
    "vocabulary": [
      {"word": "Experience", "telugu": "అనుభవం", "phonetic": "ik-speer-ee-uns", "example": "I have 3 years of experience in software development."},
      {"word": "Strength", "telugu": "బలం", "phonetic": "strength", "example": "My greatest strength is problem-solving."},
      {"word": "Weakness", "telugu": "బలహీనత", "phonetic": "week-nis", "example": "I sometimes focus too much on details."},
      {"word": "Salary expectation", "telugu": "జీతం అంచనా", "phonetic": "sal-uh-ree ek-spek-tay-shun", "example": "My salary expectation is 6 lakhs per annum."},
      {"word": "Notice period", "telugu": "నోటీసు పీరియడ్", "phonetic": "noh-tis peer-ee-ud", "example": "I have a one month notice period."}
    ],
    "dialogues": [
      {
        "title": "Common Interview Questions",
        "lines": [
          {"speaker": "Interviewer", "text": "Tell me about yourself.", "telugu": "మీ గురించి చెప్పండి."},
          {"speaker": "Candidate", "text": "I am Ramesh Kumar, a software engineer with 3 years of experience. I completed my B.Tech from JNTU Hyderabad and I am passionate about building mobile applications.", "telugu": "నేను రమేష్ కుమార్, 3 సంవత్సరాల అనుభవం ఉన్న సాఫ్ట్‌వేర్ ఇంజినీర్. నేను JNTU హైదరాబాద్ నుండి B.Tech పూర్తి చేశాను మరియు మొబైల్ అప్లికేషన్లు నిర్మించడంలో నాకు ఆసక్తి ఉంది."},
          {"speaker": "Interviewer", "text": "What are your strengths?", "telugu": "మీ బలాలు ఏమిటి?"},
          {"speaker": "Candidate", "text": "I am a quick learner and a good team player. I can work under pressure and always meet deadlines.", "telugu": "నేను త్వరగా నేర్చుకుంటాను మరియు మంచి టీమ్ ప్లేయర్. నేను ఒత్తిడిలో పని చేయగలను మరియు ఎల్లప్పుడూ గడువు తేదీలను పాటిస్తాను."}
        ]
      }
    ],
    "tips": [
      {"tip": "Speak slowly and clearly during interviews", "tip_telugu": "ఇంటర్వ్యూలలో నెమ్మదిగా మరియు స్పష్టంగా మాట్లాడండి"},
      {"tip": "Practice your answers at home", "tip_telugu": "ఇంట్లో మీ సమాధానాలు అభ్యాసం చేయండి"}
    ]
  }'
);

-- ============================================================
-- FLASHCARDS (sample set)
-- ============================================================

INSERT INTO flashcards (lesson_id, english_word, telugu_meaning, pronunciation_guide, example_sentence, example_sentence_telugu) VALUES
(
  (SELECT id FROM lessons WHERE title = 'Greetings & Introductions' LIMIT 1),
  'Hello', 'హలో', 'heh-loh', 'Hello, how are you?', 'హలో, మీరు ఎలా ఉన్నారు?'
),
(
  (SELECT id FROM lessons WHERE title = 'Greetings & Introductions' LIMIT 1),
  'Good morning', 'శుభోదయం', 'good mor-ning', 'Good morning, sir!', 'శుభోదయం, సర్!'
),
(
  (SELECT id FROM lessons WHERE title = 'Greetings & Introductions' LIMIT 1),
  'Thank you', 'ధన్యవాదాలు', 'thank yoo', 'Thank you for your help.', 'మీ సహాయానికి ధన్యవాదాలు.'
),
(
  (SELECT id FROM lessons WHERE title = 'Greetings & Introductions' LIMIT 1),
  'Please', 'దయచేసి', 'pleez', 'Please sit down.', 'దయచేసి కూర్చోండి.'
),
(
  (SELECT id FROM lessons WHERE title = 'Greetings & Introductions' LIMIT 1),
  'Sorry', 'క్షమించండి', 'sor-ee', 'Sorry, I am late.', 'క్షమించండి, నేను ఆలస్యంగా వచ్చాను.'
),
(NULL, 'Understand', 'అర్థం చేసుకోండి', 'un-der-stand', 'Do you understand?', 'మీకు అర్థమైందా?'),
(NULL, 'Repeat', 'మళ్ళీ చెప్పండి', 'ri-peet', 'Can you repeat that?', 'మీరు అది మళ్ళీ చెప్పగలరా?'),
(NULL, 'Slowly', 'నెమ్మదిగా', 'sloh-lee', 'Please speak slowly.', 'దయచేసి నెమ్మదిగా మాట్లాడండి.'),
(NULL, 'Help', 'సహాయం', 'help', 'Can you help me?', 'మీరు నాకు సహాయం చేయగలరా?'),
(NULL, 'Where', 'ఎక్కడ', 'wer', 'Where is the toilet?', 'టాయిలెట్ ఎక్కడ ఉంది?');

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================

INSERT INTO quiz_questions (lesson_id, question_text, question_text_telugu, question_type, options, correct_answer, explanation, explanation_telugu, points) VALUES
(
  (SELECT id FROM lessons WHERE title = 'Greetings & Introductions' LIMIT 1),
  'Which phrase do you use when meeting someone for the first time?',
  'మొదటిసారి ఒకరిని కలిసినప్పుడు మీరు ఏ వాక్యం ఉపయోగిస్తారు?',
  'multiple_choice',
  '["Nice to meet you", "See you later", "Good night", "You are welcome"]',
  'Nice to meet you',
  'We say "Nice to meet you" when we are introduced to someone for the first time.',
  'మొదటిసారి ఒకరితో పరిచయమైనప్పుడు "Nice to meet you" అంటాం.',
  10
),
(
  (SELECT id FROM lessons WHERE title = 'Greetings & Introductions' LIMIT 1),
  'How do you say "నా పేరు రాహుల్" in English?',
  '"నా పేరు రాహుల్" ని ఇంగ్లీష్‌లో ఎలా చెప్తారు?',
  'multiple_choice',
  '["My name is Rahul", "I am called Rahul name", "Name my is Rahul", "Rahul is my name I"]',
  'My name is Rahul',
  'The correct structure is "My name is [Name]".',
  'సరైన నిర్మాణం "My name is [పేరు]".',
  10
),
(
  (SELECT id FROM lessons WHERE title = 'Asking for Directions' LIMIT 1),
  'What do you say when you want to stop someone politely and ask a question?',
  'మర్యాదగా ఒకరిని ఆపి ప్రశ్న అడగాలనుకున్నప్పుడు ఏమంటారు?',
  'multiple_choice',
  '["Excuse me", "Hey you", "Stop", "Wait there"]',
  'Excuse me',
  '"Excuse me" is the polite way to get someone''s attention.',
  '"Excuse me" అనేది ఒకరి దృష్టిని ఆకర్షించే మర్యాదపూర్వక మార్గం.',
  10
);

-- ============================================================
-- PRONUNCIATION PHRASES
-- ============================================================

INSERT INTO pronunciation_phrases (phrase, phonetic, telugu_meaning, difficulty, category, tips) VALUES
('The thirty-three thieves thought', 'thuh thur-tee-three theevz thawt', 'ముప్పై మూడు దొంగలు అనుకున్నారు', 2, 'tongue_twister', '["Focus on the ''th'' sound", "Place tongue between teeth", "This sound does not exist in Telugu"]'),
('She sells seashells by the seashore', 'shee selz see-shelz by thuh see-shor', 'ఆమె సముద్ర తీరంలో చిప్పలు అమ్ముతుంది', 3, 'tongue_twister', '["Differentiate ''s'' and ''sh'' sounds", "Go slow first, then speed up"]'),
('How are you?', 'how ar yoo', 'మీరు ఎలా ఉన్నారు?', 1, 'greeting', '["The ''r'' in ''are'' is soft in Indian English", "Stress on ''how''"]'),
('I would like to place an order', 'I wood lyk too plays an or-der', 'నేను ఆర్డర్ చేయాలనుకుంటున్నాను', 2, 'restaurant', '["''Would'' sounds like ''wood''", "Speak confidently"]'),
('Could you please repeat that?', 'kood yoo pleez ri-peet that', 'దయచేసి అది మళ్ళీ చెప్పగలరా?', 2, 'general', '["''Could'' ends softly, don''t stress the ''d''", "Raise pitch slightly at the end"]'),
('I am not sure I understand', 'I am not shoor I un-der-stand', 'నాకు అర్థమైందో లేదో తెలియడం లేదు', 2, 'general', '["Be honest when you don''t understand", "This phrase is very useful in conversations"]'),
('What is the price of this?', 'wot iz thuh prys ov this', 'దీని ధర ఏమిటి?', 1, 'shopping', '["''Price'' - the ''i'' sounds like ''eye''", "Point to the item while saying this"]'),
('Can I speak to the manager?', 'kan I speek too thuh man-uh-jer', 'నేను మేనేజర్‌తో మాట్లాడవచ్చా?', 2, 'office', '["Use a polite, firm tone", "''Manager'' - stress on first syllable"]');

-- ============================================================
-- ROLEPLAY SCENARIOS
-- ============================================================

INSERT INTO roleplay_scenarios (title, title_telugu, description, description_telugu, scenario_type, ai_persona, ai_persona_description, system_prompt, starter_message, difficulty_level, xp_reward) VALUES
(
  'Job Interview Practice',
  'జాబ్ ఇంటర్వ్యూ అభ్యాసం',
  'Practice for a software engineer position interview',
  'సాఫ్ట్‌వేర్ ఇంజినీర్ పోస్ట్ ఇంటర్వ్యూ కోసం అభ్యాసం చేయండి',
  'interview',
  'Ms. Sharma',
  'HR Manager at a leading IT company in Hyderabad',
  'You are Ms. Sharma, a professional HR manager at a top IT company. You are conducting a job interview for a software engineer position. Ask standard interview questions one at a time. After each answer from the candidate, give brief feedback on their English (grammar, vocabulary, confidence) and then ask the next question. Be encouraging but professional. Use simple, clear English. Occasionally switch key words to Telugu to help the student understand. The interview is for a junior software engineer position.',
  'Good morning! Please have a seat. I am Ms. Sharma from HR. Thank you for coming in today. Before we begin, can you tell me a little about yourself?',
  2, 50
),
(
  'Shopping at a Mall',
  'మాల్‌లో షాపింగ్',
  'Practice buying clothes and asking for discounts',
  'బట్టలు కొనడం మరియు తగ్గింపులు అడగడం అభ్యాసం చేయండి',
  'shopping',
  'Ravi',
  'A helpful shop assistant at a clothing store',
  'You are Ravi, a friendly and helpful shop assistant at a popular clothing store in a mall. Help the customer (the student) find clothes, tell them about prices, suggest sizes, and inform about discounts. Use simple English. When the student makes grammar mistakes, gently correct them by repeating what they said correctly. Be warm and encouraging. Keep responses short and conversational.',
  'Welcome to FashionMart! How can I help you today? Are you looking for something specific, or just browsing?',
  1, 30
),
(
  'Doctor Consultation',
  'డాక్టర్ సంప్రదింపు',
  'Practice describing symptoms to a doctor',
  'డాక్టర్‌కు లక్షణాలు వివరించడం అభ్యాసం చేయండి',
  'medical',
  'Dr. Reddy',
  'A general physician at a clinic',
  'You are Dr. Reddy, a kind and patient general physician. A patient (the student) has come for a consultation. Ask about their symptoms, medical history, and give basic advice. Use simple, clear medical English. Explain medical terms in simple language. After every 2-3 exchanges, briefly note the English vocabulary the patient used well. Keep the consultation realistic but simple.',
  'Good morning! Please come in and sit down. I am Dr. Reddy. What brings you here today? What seems to be the problem?',
  2, 40
),
(
  'Ordering at a Restaurant',
  'రెస్టారెంట్‌లో ఆర్డర్ చేయడం',
  'Practice ordering food and interacting with waiters',
  'తినుబండారాలు ఆర్డర్ చేయడం మరియు వెయిటర్లతో సంభాషించడం అభ్యాసం',
  'restaurant',
  'Kiran',
  'A waiter at a nice restaurant',
  'You are Kiran, a polite waiter at a nice restaurant. Take the customer''s order, answer questions about the menu, suggest dishes, and handle requests professionally. Use hospitality English. When the customer struggles, offer helpful phrases. Be friendly and patient.',
  'Good evening! Welcome to Spice Garden. My name is Kiran and I will be your server tonight. Can I start you off with some drinks?',
  1, 25
);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================

INSERT INTO achievements (name, name_telugu, description, description_telugu, icon_name, badge_color, requirement_type, requirement_value, xp_reward) VALUES
('First Step', 'మొదటి అడుగు', 'Complete your first lesson', 'మీ మొదటి పాఠాన్ని పూర్తి చేయండి', 'star', '#FFD700', 'lessons_completed', 1, 50),
('Streak Starter', 'స్ట్రీక్ స్టార్టర్', 'Maintain a 3-day streak', '3 రోజుల స్ట్రీక్ నిర్వహించండి', 'fire', '#FF6B35', 'streak', 3, 75),
('Week Warrior', 'వారం యోధుడు', 'Maintain a 7-day streak', '7 రోజుల స్ట్రీక్ నిర్వహించండి', 'shield', '#FF4500', 'streak', 7, 150),
('Month Master', 'మాస మాస్టర్', 'Maintain a 30-day streak', '30 రోజుల స్ట్రీక్ నిర్వహించండి', 'trophy', '#FFD700', 'streak', 30, 500),
('XP Hunter', 'XP వేటగాడు', 'Earn 500 XP total', 'మొత్తం 500 XP సంపాదించండి', 'zap', '#7C3AED', 'xp', 500, 100),
('XP Champion', 'XP ఛాంపియన్', 'Earn 5000 XP total', 'మొత్తం 5000 XP సంపాదించండి', 'award', '#0EA5E9', 'xp', 5000, 300),
('Quiz Master', 'క్విజ్ మాస్టర్', 'Pass 10 quizzes', '10 క్విజ్‌లు పాస్ చేయండి', 'check-circle', '#059669', 'quizzes_passed', 10, 200),
('Chatterbox', 'చాటర్‌బాక్స్', 'Complete 5 chat sessions', '5 చాట్ సెషన్‌లు పూర్తి చేయండి', 'message-circle', '#EC4899', 'chat_sessions', 5, 150),
('Lesson Legend', 'పాఠం పురాణం', 'Complete 25 lessons', '25 పాఠాలు పూర్తి చేయండి', 'book', '#F59E0B', 'lessons_completed', 25, 400),
('Daily Champion', 'రోజువారీ ఛాంపియన్', 'Active for 30 days total', 'మొత్తం 30 రోజులు చురుకుగా ఉండండి', 'calendar', '#10B981', 'days_active', 30, 350);

-- ============================================================
-- DAILY CHALLENGES (sample)
-- ============================================================

INSERT INTO daily_challenges (title, title_telugu, description, challenge_type, content, xp_reward, valid_date) VALUES
(
  'Vocabulary Flash',
  'పదజాల ఫ్లాష్',
  'Learn 5 new words today',
  'vocabulary',
  '{
    "words": [
      {"word": "Accomplish", "telugu": "సాధించు", "sentence": "I want to accomplish my goals."},
      {"word": "Confident", "telugu": "నమ్మకంగా", "sentence": "Speak confident English every day."},
      {"word": "Practice", "telugu": "అభ్యాసం", "sentence": "Practice makes perfect."},
      {"word": "Improve", "telugu": "మెరుగుపరచు", "sentence": "I want to improve my English."},
      {"word": "Fluent", "telugu": "అనర్గళంగా", "sentence": "She speaks fluent English."}
    ],
    "quiz": [
      {"question": "''సాధించు'' means?", "options": ["Accomplish", "Forget", "Sleep", "Run"], "answer": "Accomplish"},
      {"question": "Which word means ''అభ్యాసం''?", "options": ["Rest", "Practice", "Speak", "Learn"], "answer": "Practice"}
    ]
  }',
  30,
  CURRENT_DATE
);
