-- ============================================================
-- EnglishMitraAi - Expanded Vocabulary Migration
-- 009_expanded_vocabulary.sql
-- Adds 80+ flashcards across 4 categories:
--   Business English, Daily Life, Academic, Interview/Professional
-- ============================================================

-- ============================================================
-- ENSURE LESSON CATEGORIES EXIST FOR NEW VOCABULARY SETS
-- (insert only if not already present)
-- ============================================================

-- lesson_categories.name has no UNIQUE constraint, so we use WHERE NOT EXISTS for idempotency
INSERT INTO lesson_categories (name, name_telugu, description, description_telugu, icon_name, color_hex, sort_order)
SELECT 'Business English', 'వ్యాపార ఇంగ్లీష్', 'Professional vocabulary for the corporate world', 'కార్పొరేట్ రంగంలో వృత్తిపరమైన పదజాలం', 'briefcase', '#1D4ED8', 11
WHERE NOT EXISTS (SELECT 1 FROM lesson_categories WHERE name = 'Business English');

INSERT INTO lesson_categories (name, name_telugu, description, description_telugu, icon_name, color_hex, sort_order)
SELECT 'Daily Life English', 'రోజువారీ జీవిత ఇంగ్లీష్', 'Essential words for everyday situations', 'రోజువారీ పరిస్థితులకు అవసరమైన పదాలు', 'home', '#059669', 12
WHERE NOT EXISTS (SELECT 1 FROM lesson_categories WHERE name = 'Daily Life English');

INSERT INTO lesson_categories (name, name_telugu, description, description_telugu, icon_name, color_hex, sort_order)
SELECT 'Academic English', 'విద్యాసంబంధ ఇంగ్లీష్', 'Vocabulary for studies and academic writing', 'అధ్యయనం మరియు విద్యా రచనకు పదజాలం', 'book-open', '#7C3AED', 13
WHERE NOT EXISTS (SELECT 1 FROM lesson_categories WHERE name = 'Academic English');

INSERT INTO lesson_categories (name, name_telugu, description, description_telugu, icon_name, color_hex, sort_order)
SELECT 'Interview English', 'ఇంటర్వ్యూ ఇంగ్లీష్', 'Words to impress at job interviews and workplaces', 'ఉద్యోగ ఇంటర్వ్యూలలో ఆకట్టుకునే పదజాలం', 'user-check', '#DC2626', 14
WHERE NOT EXISTS (SELECT 1 FROM lesson_categories WHERE name = 'Interview English');

-- ============================================================
-- BUSINESS ENGLISH FLASHCARDS (20 words)
-- Difficulty: B1=3, B2=4, C1=5
-- ============================================================

INSERT INTO flashcards
  (lesson_id, category_id, english_word, telugu_meaning, pronunciation_guide,
   example_sentence, example_sentence_telugu, difficulty, is_active)
VALUES

-- 1. negotiate (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Negotiate',
 'చర్చించు / సంప్రదించు',
 'ni-GOH-shee-ayt',
 'We need to negotiate the contract terms before signing.',
 'సంతకం చేయడానికి ముందు మేము ఒప్పంద నిబంధనలను చర్చించాలి.',
 4, TRUE),

-- 2. agenda (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Agenda',
 'కార్యక్రమం పట్టిక',
 'uh-JEN-duh',
 'Please send the meeting agenda before tomorrow.',
 'రేపటికి ముందు సమావేశం యొక్క కార్యక్రమం పట్టికను పంపండి.',
 3, TRUE),

-- 3. deadline (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Deadline',
 'గడువు తేదీ',
 'DED-layn',
 'The deadline for submitting the report is Friday.',
 'నివేదిక సమర్పించే గడువు తేదీ శుక్రవారం.',
 3, TRUE),

-- 4. stakeholder (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Stakeholder',
 'వాటాదారు / సంబంధిత పక్షం',
 'STAYK-hohl-der',
 'All stakeholders must approve the new project plan.',
 'కొత్త ప్రాజెక్ట్ ప్రణాళికను అన్ని వాటాదారులు ఆమోదించాలి.',
 5, TRUE),

-- 5. milestone (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Milestone',
 'ముఖ్యమైన దశ / మైలురాయి',
 'MYL-stohn',
 'Launching the app is a major milestone for our team.',
 'యాప్ లాంచ్ చేయడం మా జట్టుకు ఒక ముఖ్యమైన దశ.',
 4, TRUE),

-- 6. deliverable (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Deliverable',
 'సమర్పించవలసిన వస్తువు / ఫలితం',
 'di-LIV-er-uh-bul',
 'The key deliverable for this sprint is the login module.',
 'ఈ స్ప్రింట్‌కు ముఖ్యమైన ఫలితం లాగిన్ మాడ్యూల్.',
 5, TRUE),

-- 7. leverage (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Leverage',
 'ప్రయోజనం పొందు / సద్వినియోగం చేసుకో',
 'LEV-er-ij',
 'We can leverage our existing network to find new clients.',
 'కొత్త క్లయింట్లను కనుగొనడానికి మేము మా ఇప్పటికే ఉన్న నెట్‌వర్క్‌ను సద్వినియోగం చేసుకోవచ్చు.',
 5, TRUE),

-- 8. synergy (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Synergy',
 'సమష్టి శక్తి / పరస్పర సహకార లాభం',
 'SIN-er-jee',
 'There is great synergy between the two departments.',
 'రెండు విభాగాల మధ్య గొప్ప సమష్టి శక్తి ఉంది.',
 5, TRUE),

-- 9. portfolio (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Portfolio',
 'పని నమూనాల సంకలనం / పోర్ట్‌ఫోలియో',
 'port-FOH-lee-oh',
 'Please share your portfolio before the interview.',
 'ఇంటర్వ్యూకు ముందు మీ పోర్ట్‌ఫోలియోను పంచుకోండి.',
 4, TRUE),

-- 10. initiative (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Initiative',
 'చొరవ / ముందడుగు',
 'i-NISH-uh-tiv',
 'She took the initiative to fix the bug before anyone asked.',
 'ఎవరూ అడగకముందే ఆమె బగ్‌ను సరిచేయడానికి చొరవ తీసుకుంది.',
 4, TRUE),

-- 11. benchmark (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Benchmark',
 'ప్రమాణం / కొలమానం',
 'BENCH-mark',
 'This score sets the benchmark for future performance.',
 'ఈ స్కోరు భవిష్యత్ పనితీరుకు ప్రమాణాన్ని నిర్ణయిస్తుంది.',
 4, TRUE),

-- 12. compliance (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Compliance',
 'నిబంధనల పాటింపు / అనుసరణ',
 'kum-PLY-uns',
 'All employees must follow the compliance guidelines.',
 'అందరు ఉద్యోగులు నిబంధనల పాటింపు మార్గదర్శకాలను అనుసరించాలి.',
 5, TRUE),

-- 13. revenue (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Revenue',
 'ఆదాయం / రాబడి',
 'REV-en-yoo',
 'The company''s revenue increased by 20% this year.',
 'కంపెనీ ఆదాయం ఈ సంవత్సరం 20% పెరిగింది.',
 4, TRUE),

-- 14. incentive (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Incentive',
 'ప్రోత్సాహకం / ప్రేరేపణ',
 'in-SEN-tiv',
 'Performance bonuses are a great incentive for employees.',
 'పనితీరు బోనస్‌లు ఉద్యోగులకు గొప్ప ప్రోత్సాహకం.',
 4, TRUE),

-- 15. proposal (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Proposal',
 'ప్రతిపాదన / ప్రాజెక్ట్ ప్రణాళిక',
 'pruh-POH-zul',
 'Please review the project proposal and give feedback.',
 'ప్రాజెక్ట్ ప్రతిపాదనను సమీక్షించి అభిప్రాయం ఇవ్వండి.',
 3, TRUE),

-- 16. quarterly (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Quarterly',
 'త్రైమాసిక / మూడు నెలలకొకసారి',
 'KWOR-ter-lee',
 'We hold quarterly reviews to assess team performance.',
 'జట్టు పనితీరును అంచనా వేయడానికి మేము త్రైమాసిక సమీక్షలు నిర్వహిస్తాము.',
 4, TRUE),

-- 17. invoice (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Invoice',
 'చెల్లింపు పత్రం / ఇన్వాయిస్',
 'IN-voys',
 'Please send the invoice after completing the work.',
 'పని పూర్తి చేసిన తర్వాత చెల్లింపు పత్రాన్ని పంపండి.',
 3, TRUE),

-- 18. collaborate (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Collaborate',
 'కలిసి పనిచేయు / సహకరించు',
 'kuh-LAB-uh-rayt',
 'Our teams collaborate across two different cities.',
 'మా జట్లు రెండు వేర్వేరు నగరాల్లో కలిసి పనిచేస్తాయి.',
 3, TRUE),

-- 19. facilitate (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Facilitate',
 'సులభతరం చేయు / సహాయపడు',
 'fuh-SIL-i-tayt',
 'The manager will facilitate the discussion between the two teams.',
 'మేనేజర్ రెండు జట్ల మధ్య చర్చను సులభతరం చేస్తారు.',
 5, TRUE),

-- 20. presentation (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Business English' LIMIT 1),
 'Presentation',
 'సమర్పణ / ప్రెజెంటేషన్',
 'prez-en-TAY-shun',
 'She gave an excellent presentation to the board of directors.',
 'ఆమె డైరెక్టర్ల బోర్డుకు అద్భుతమైన సమర్పణ చేసింది.',
 3, TRUE),

-- ============================================================
-- DAILY LIFE ENGLISH FLASHCARDS (20 words)
-- Difficulty: A1=1, A2=2, B1=3
-- ============================================================

-- 21. commute (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Commute',
 'రోజువారీ ప్రయాణం (ఇల్లు నుండి పని వరకు)',
 'kuh-MYOOT',
 'My daily commute to the office takes 45 minutes.',
 'కార్యాలయానికి నా రోజువారీ ప్రయాణం 45 నిమిషాలు తీసుకుంటుంది.',
 2, TRUE),

-- 22. convenience (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Convenience',
 'సౌకర్యం / వీలు',
 'kun-VEE-nee-uns',
 'Online shopping offers great convenience.',
 'ఆన్‌లైన్ షాపింగ్ గొప్ప సౌకర్యాన్ని అందిస్తుంది.',
 3, TRUE),

-- 23. groceries (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Groceries',
 'కూరగాయలు మరియు నిత్యావసరాలు',
 'GROH-ser-eez',
 'I need to buy groceries from the market today.',
 'నేను ఈరోజు మార్కెట్ నుండి నిత్యావసరాలు కొనాలి.',
 2, TRUE),

-- 24. maintenance (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Maintenance',
 'నిర్వహణ / మరమ్మత్తు',
 'MAYN-tuh-nuns',
 'The building maintenance team fixes all repairs.',
 'భవన నిర్వహణ జట్టు అన్ని మరమ్మత్తులను సరిచేస్తుంది.',
 3, TRUE),

-- 25. subscription (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Subscription',
 'చందా / సభ్యత్వం',
 'sub-SKRIP-shun',
 'I have a monthly subscription to a streaming service.',
 'నాకు స్ట్రీమింగ్ సేవకు నెలవారీ చందా ఉంది.',
 3, TRUE),

-- 26. budget (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Budget',
 'బడ్జెట్ / ఖర్చుల అంచనా',
 'BUJ-it',
 'I try to stick to my monthly budget.',
 'నేను నా నెలవారీ బడ్జెట్‌ను పాటించే ప్రయత్నం చేస్తాను.',
 2, TRUE),

-- 27. appointment (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Appointment',
 'నిర్ణీత సమయం / అపాయింట్‌మెంట్',
 'uh-POYNT-munt',
 'I have a doctor''s appointment at 11 AM tomorrow.',
 'రేపు ఉదయం 11 గంటలకు నాకు డాక్టర్ అపాయింట్‌మెంట్ ఉంది.',
 2, TRUE),

-- 28. neighborhood (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Neighborhood',
 'పొరుగు ప్రాంతం / పరిసరాలు',
 'NAY-ber-hud',
 'We live in a friendly neighborhood near the park.',
 'మేము పార్కు దగ్గర స్నేహపూర్వక పొరుగు ప్రాంతంలో నివసిస్తాము.',
 2, TRUE),

-- 29. appliance (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Appliance',
 'విద్యుత్ పరికరం / గృహోపకరణం',
 'uh-PLY-uns',
 'The washing machine is an essential home appliance.',
 'వాషింగ్ మెషీన్ ఒక అవసరమైన గృహోపకరణం.',
 3, TRUE),

-- 30. ingredients (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Ingredients',
 'వంటకంలో వేసే వస్తువులు / పదార్థాలు',
 'in-GREE-dee-unts',
 'Mix all the ingredients together in a large bowl.',
 'అన్ని పదార్థాలను పెద్ద గిన్నెలో కలపండి.',
 2, TRUE),

-- 31. schedule (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Schedule',
 'కార్యక్రమ సూచి / షెడ్యూల్',
 'SKED-yool',
 'My work schedule is very busy this week.',
 'ఈ వారం నా పని షెడ్యూల్ చాలా బిజీగా ఉంది.',
 2, TRUE),

-- 32. recommendation (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Recommendation',
 'సిఫారసు / సూచన',
 'rek-uh-men-DAY-shun',
 'Do you have any restaurant recommendations nearby?',
 'దగ్గరలో మంచి రెస్టారెంట్ సిఫారసులు ఏమైనా ఉన్నాయా?',
 3, TRUE),

-- 33. availability (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Availability',
 'అందుబాటులో ఉండటం / లభ్యత',
 'uh-vayl-uh-BIL-i-tee',
 'Please check the availability of seats before booking.',
 'బుకింగ్ చేయడానికి ముందు సీట్ల లభ్యతను తనిఖీ చేయండి.',
 3, TRUE),

-- 34. complaint (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Complaint',
 'ఫిర్యాదు / అభ్యంతరం',
 'kum-PLAYNT',
 'I filed a complaint about the noisy neighbors.',
 'నేను గోలగా ఉన్న పొరుగువారి గురించి ఫిర్యాదు చేశాను.',
 2, TRUE),

-- 35. satisfaction (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Satisfaction',
 'సంతృప్తి / తృప్తి',
 'sat-is-FAK-shun',
 'Customer satisfaction is our top priority.',
 'కస్టమర్ సంతృప్తి మా అగ్ర ప్రాధాన్యత.',
 3, TRUE),

-- 36. warranty (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Warranty',
 'వారంటీ / హామీ పత్రం',
 'WOR-un-tee',
 'The TV comes with a two-year warranty.',
 'టీవీతో రెండు సంవత్సరాల వారంటీ వస్తుంది.',
 3, TRUE),

-- 37. purchase (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Purchase',
 'కొనుగోలు చేయు',
 'PER-chus',
 'I want to purchase a new smartphone next month.',
 'నేను వచ్చే నెల కొత్త స్మార్ట్‌ఫోన్ కొనాలనుకుంటున్నాను.',
 2, TRUE),

-- 38. feedback (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Feedback',
 'అభిప్రాయం / స్పందన',
 'FEED-bak',
 'Please give me your feedback on this new app.',
 'ఈ కొత్త యాప్ పై మీ అభిప్రాయాన్ని తెలియజేయండి.',
 2, TRUE),

-- 39. transaction (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Transaction',
 'వ్యవహారం / లావాదేవీ',
 'tran-ZAK-shun',
 'The online transaction was completed successfully.',
 'ఆన్‌లైన్ లావాదేవీ విజయవంతంగా పూర్తయింది.',
 3, TRUE),

-- 40. refund (A2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Daily Life English' LIMIT 1),
 'Refund',
 'డబ్బు తిరిగి ఇవ్వడం / వాపసు',
 'REE-fund',
 'I requested a refund because the product was damaged.',
 'ఉత్పత్తి దెబ్బతిన్నందున నేను వాపసు అడిగాను.',
 2, TRUE),

-- ============================================================
-- ACADEMIC ENGLISH FLASHCARDS (20 words)
-- Difficulty: B1=3, B2=4, C1=5
-- ============================================================

-- 41. analyze (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Analyze',
 'విశ్లేషించు',
 'AN-uh-lyz',
 'We need to analyze the data before drawing conclusions.',
 'నిర్ణయాలు తీసుకోవడానికి ముందు మేము డేటాను విశ్లేషించాలి.',
 3, TRUE),

-- 42. hypothesis (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Hypothesis',
 'పరికల్పన / తాత్కాలిక సిద్ధాంతం',
 'hy-POTH-uh-sis',
 'The scientist tested her hypothesis with an experiment.',
 'శాస్త్రవేత్త తన పరికల్పనను ఒక ప్రయోగంతో పరీక్షించింది.',
 5, TRUE),

-- 43. literature (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Literature',
 'సాహిత్యం / పరిశోధన గ్రంథాలు',
 'LIT-er-uh-cher',
 'The literature review covers research from the last ten years.',
 'సాహిత్య సమీక్ష గత పది సంవత్సరాల పరిశోధనను కవర్ చేస్తుంది.',
 4, TRUE),

-- 44. methodology (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Methodology',
 'పద్ధతి శాస్త్రం / పరిశోధనా విధానం',
 'meth-uh-DOL-uh-jee',
 'Explain the research methodology in your report.',
 'మీ నివేదికలో పరిశోధనా విధానాన్ని వివరించండి.',
 5, TRUE),

-- 45. evaluation (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Evaluation',
 'మూల్యాంకనం / అంచనా',
 'i-val-yoo-AY-shun',
 'The teacher''s evaluation showed strong improvement.',
 'ఉపాధ్యాయుని మూల్యాంకనం బలమైన మెరుగుదలను చూపించింది.',
 4, TRUE),

-- 46. objective (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Objective',
 'లక్ష్యం / నిష్పక్షపాతంగా',
 'ob-JEK-tiv',
 'State the main objective of your research clearly.',
 'మీ పరిశోధన యొక్క ముఖ్య లక్ష్యాన్ని స్పష్టంగా పేర్కొనండి.',
 3, TRUE),

-- 47. concept (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Concept',
 'భావన / అవగాహన',
 'KON-sept',
 'This chapter introduces the concept of supply and demand.',
 'ఈ అధ్యాయం సరఫరా మరియు డిమాండ్ భావనను పరిచయం చేస్తుంది.',
 3, TRUE),

-- 48. evidence (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Evidence',
 'ఆధారాలు / సాక్ష్యం',
 'EV-i-dens',
 'Provide evidence to support your argument.',
 'మీ వాదనకు మద్దతుగా ఆధారాలు అందించండి.',
 3, TRUE),

-- 49. research (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Research',
 'పరిశోధన',
 'REE-serch',
 'She published her research in a leading journal.',
 'ఆమె తన పరిశోధనను ఒక ప్రముఖ జర్నల్‌లో ప్రచురించింది.',
 3, TRUE),

-- 50. theory (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Theory',
 'సిద్ధాంతం',
 'THEE-uh-ree',
 'Darwin''s theory of evolution changed biology forever.',
 'డార్విన్ పరిణామ సిద్ధాంతం జీవశాస్త్రాన్ని శాశ్వతంగా మార్చివేసింది.',
 4, TRUE),

-- 51. critique (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Critique',
 'విమర్శ / సమీక్ష',
 'kri-TEEK',
 'Write a critique of the article you read.',
 'మీరు చదివిన వ్యాసంపై ఒక విమర్శ రాయండి.',
 5, TRUE),

-- 52. perspective (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Perspective',
 'దృక్కోణం / అభిప్రాయం',
 'per-SPEK-tiv',
 'Consider the problem from different perspectives.',
 'వేర్వేరు దృక్కోణాల నుండి సమస్యను పరిగణించండి.',
 4, TRUE),

-- 53. significant (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Significant',
 'ముఖ్యమైన / గణనీయమైన',
 'sig-NIF-i-kunt',
 'The results show a significant improvement in scores.',
 'ఫలితాలు స్కోర్లలో గణనీయమైన మెరుగుదలను చూపిస్తున్నాయి.',
 4, TRUE),

-- 54. demonstrate (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Demonstrate',
 'నిరూపించు / చూపించు',
 'DEM-un-strayt',
 'The experiment demonstrates how plants absorb water.',
 'మొక్కలు నీటిని ఎలా గ్రహిస్తాయో ప్రయోగం నిరూపిస్తుంది.',
 4, TRUE),

-- 55. reference (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Reference',
 'సూచన / ఆధార గ్రంథం',
 'REF-er-uns',
 'Always include references at the end of your assignment.',
 'మీ అసైన్‌మెంట్ చివరిలో ఎల్లప్పుడూ ఆధార గ్రంథాలను చేర్చండి.',
 3, TRUE),

-- 56. conclusion (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Conclusion',
 'నిర్ణయం / ముగింపు',
 'kun-KLOO-zhun',
 'Write a clear conclusion at the end of your essay.',
 'మీ వ్యాసం చివరిలో స్పష్టమైన ముగింపు రాయండి.',
 3, TRUE),

-- 57. argument (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Argument',
 'వాదన / తర్కం',
 'AR-gyoo-munt',
 'Present a strong argument to support your opinion.',
 'మీ అభిప్రాయానికి మద్దతివ్వడానికి బలమైన వాదన సమర్పించండి.',
 4, TRUE),

-- 58. illustrate (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Illustrate',
 'వివరించు / ఉదాహరణతో చూపించు',
 'IL-uh-strayt',
 'Use a diagram to illustrate the process.',
 'ప్రక్రియను వివరించడానికి ఒక రేఖాచిత్రాన్ని ఉపయోగించండి.',
 4, TRUE),

-- 59. contribute (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Contribute',
 'సహకరించు / దోహదపడు',
 'kun-TRIB-yoot',
 'Everyone should contribute ideas during the discussion.',
 'చర్చ సమయంలో అందరూ ఆలోచనలు చేకూర్చాలి.',
 4, TRUE),

-- 60. framework (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Academic English' LIMIT 1),
 'Framework',
 'చట్రం / నిర్మాణ పద్ధతి',
 'FRAYM-werk',
 'This study uses a theoretical framework based on social learning.',
 'ఈ అధ్యయనం సామాజిక అభ్యాసంపై ఆధారపడిన సైద్ధాంతిక నిర్మాణ పద్ధతిని ఉపయోగిస్తుంది.',
 5, TRUE),

-- ============================================================
-- INTERVIEW / PROFESSIONAL ENGLISH FLASHCARDS (20 words)
-- Difficulty: B1=3, B2=4, C1=5
-- ============================================================

-- 61. expertise (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Expertise',
 'నిపుణత / ప్రత్యేక నైపుణ్యం',
 'ek-sper-TEES',
 'My expertise is in backend software development.',
 'నా నిపుణత బ్యాకెండ్ సాఫ్ట్‌వేర్ అభివృద్ధిలో ఉంది.',
 5, TRUE),

-- 62. qualification (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Qualification',
 'అర్హత / విద్యాపరమైన డిగ్రీ',
 'kwol-i-fi-KAY-shun',
 'My qualifications include a B.Tech degree and two certifications.',
 'నా అర్హతలలో B.Tech డిగ్రీ మరియు రెండు సర్టిఫికేషన్లు ఉన్నాయి.',
 4, TRUE),

-- 63. achievement (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Achievement',
 'విజయం / సాధన',
 'uh-CHEEV-munt',
 'My greatest achievement was leading a team of ten engineers.',
 'నా గొప్ప సాధన పది ఇంజినీర్ల జట్టుకు నాయకత్వం వహించడం.',
 4, TRUE),

-- 64. initiative (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Initiative',
 'చొరవ / స్వచ్ఛంద చర్య',
 'i-NISH-uh-tiv',
 'I always take initiative to solve problems without being asked.',
 'నేను ఎల్లప్పుడూ అడగకుండానే సమస్యలను పరిష్కరించడానికి చొరవ తీసుకుంటాను.',
 4, TRUE),

-- 65. leadership (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Leadership',
 'నాయకత్వం',
 'LEE-der-ship',
 'Strong leadership skills helped me manage a large team.',
 'బలమైన నాయకత్వ నైపుణ్యాలు పెద్ద జట్టును నిర్వహించడంలో నాకు సహాయపడ్డాయి.',
 4, TRUE),

-- 66. teamwork (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Teamwork',
 'జట్టు పని / సహకార పని',
 'TEEM-werk',
 'Good teamwork is essential for completing projects on time.',
 'ప్రాజెక్టులను సమయానికి పూర్తి చేయడానికి మంచి జట్టు పని అవసరం.',
 3, TRUE),

-- 67. communicate (B1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Communicate',
 'సంభాషించు / తెలియజేయు',
 'kuh-MYOO-ni-kayt',
 'I can communicate effectively with clients and team members.',
 'నేను క్లయింట్లు మరియు జట్టు సభ్యులతో సమర్థవంతంగా సంభాషించగలను.',
 3, TRUE),

-- 68. adaptable (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Adaptable',
 'అనుసరించగల / అనుకూలపడగల',
 'uh-DAP-tuh-bul',
 'Being adaptable helped me succeed in many different roles.',
 'అనుసరించగల స్వభావం అనేక వేర్వేరు పాత్రలలో విజయం సాధించడంలో నాకు సహాయపడింది.',
 5, TRUE),

-- 69. proactive (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Proactive',
 'ముందుగా స్పందించే / క్రియాశీలక',
 'proh-AK-tiv',
 'A proactive employee does not wait to be told what to do.',
 'క్రియాశీలక ఉద్యోగుడు ఏమి చేయాలో చెప్పేవరకు వేచి ఉండడు.',
 5, TRUE),

-- 70. strategic (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Strategic',
 'వ్యూహాత్మక / ప్రణాళికాపరమైన',
 'struh-TEE-jik',
 'I make strategic decisions to improve project outcomes.',
 'ప్రాజెక్ట్ ఫలితాలను మెరుగుపరచడానికి నేను వ్యూహాత్మక నిర్ణయాలు తీసుకుంటాను.',
 5, TRUE),

-- 71. efficient (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Efficient',
 'సమర్థవంతమైన / చక్కగా పని చేసే',
 'i-FISH-unt',
 'An efficient worker completes tasks with minimum waste.',
 'సమర్థవంతమైన పని వ్యక్తి కనీస వ్యర్థంతో పనులు పూర్తి చేస్తాడు.',
 4, TRUE),

-- 72. innovative (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Innovative',
 'వినూత్నమైన / కొత్త ఆలోచనలు కల',
 'IN-uh-vay-tiv',
 'Our team is known for developing innovative solutions.',
 'వినూత్న పరిష్కారాలు అభివృద్ధి చేయడంలో మా జట్టు పేరు గాంచింది.',
 4, TRUE),

-- 73. mentor (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Mentor',
 'మార్గదర్శకుడు / గురువు',
 'MEN-tor',
 'My manager was an excellent mentor throughout my career.',
 'నా మేనేజర్ నా వృత్తి జీవితమంతా అద్భుతమైన మార్గదర్శకుడు.',
 4, TRUE),

-- 74. accountability (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Accountability',
 'జవాబుదారీతనం / బాధ్యత',
 'uh-kown-tuh-BIL-i-tee',
 'Taking accountability for mistakes shows maturity.',
 'తప్పులకు జవాబుదారీతనం తీసుకోవడం పరిపక్వతను చూపిస్తుంది.',
 5, TRUE),

-- 75. performance (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Performance',
 'పనితీరు / పనితనం',
 'per-FOR-muns',
 'My performance review was very positive last quarter.',
 'గత త్రైమాసికంలో నా పనితీరు సమీక్ష చాలా సానుకూలంగా ఉంది.',
 4, TRUE),

-- 76. integrity (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Integrity',
 'నిజాయితీ / నైతిక నిష్ఠ',
 'in-TEG-ri-tee',
 'Working with integrity earns respect from colleagues.',
 'నైతిక నిష్ఠతో పనిచేయడం సహోద్యోగుల గౌరవాన్ని పొందుతుంది.',
 5, TRUE),

-- 77. proficiency (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Proficiency',
 'నైపుణ్యం / ప్రవీణత',
 'pruh-FISH-un-see',
 'I have proficiency in Python and Java programming languages.',
 'నాకు Python మరియు Java ప్రోగ్రామింగ్ భాషలలో నైపుణ్యం ఉంది.',
 5, TRUE),

-- 78. negotiate (B2) — interview context
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Negotiate',
 'చర్చించు / బేరమాడు',
 'ni-GOH-shee-ayt',
 'I am prepared to negotiate my salary based on responsibilities.',
 'బాధ్యతల ఆధారంగా నా జీతాన్ని చర్చించడానికి నేను సిద్ధంగా ఉన్నాను.',
 4, TRUE),

-- 79. prioritize (B2)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Prioritize',
 'ముందు చేయవలసినదాన్ని నిర్ణయించు / ప్రాధాన్యత ఇవ్వు',
 'pry-OR-i-tyz',
 'I always prioritize urgent tasks to meet deadlines.',
 'గడువు తేదీలను పాటించడానికి నేను ఎల్లప్పుడూ అత్యవసర పనులకు ప్రాధాన్యత ఇస్తాను.',
 4, TRUE),

-- 80. delegate (C1)
(NULL,
 (SELECT id FROM lesson_categories WHERE name = 'Interview English' LIMIT 1),
 'Delegate',
 'అప్పగించు / బాధ్యత అందజేయు',
 'DEL-i-gayt',
 'A good leader knows how to delegate tasks to the right people.',
 'మంచి నాయకుడు సరైన వ్యక్తులకు పనులను అప్పగించడం ఎలాగో తెలుసుకుంటాడు.',
 5, TRUE)

ON CONFLICT DO NOTHING;

-- ============================================================
-- END OF 009_expanded_vocabulary.sql
-- Total words inserted: 80
--   Business English  : 20 (words 1-20)
--   Daily Life English: 20 (words 21-40)
--   Academic English  : 20 (words 41-60)
--   Interview English : 20 (words 61-80)
-- ============================================================
