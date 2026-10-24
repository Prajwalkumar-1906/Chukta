import { APP_NAME, SupportedLocale } from '@chukta/shared';

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
}

const EMAIL_STRINGS: Record<SupportedLocale, {
  verifyTitle: string;
  verifyBody: string;
  verifyButton: string;
  verifyExpiry: string;
  resetTitle: string;
  resetBody: string;
  resetButton: string;
  resetExpiry: string;
  suspiciousTitle: string;
  suspiciousBody: string;
  suspiciousTime: string;
  suspiciousIp: string;
  suspiciousDevice: string;
  suspiciousAction: string;
  digestTitle: string;
  digestBody: string;
  digestOwed: string;
  digestOwe: string;
  digestButton: string;
  paymentTitle: string;
  paymentBody: string;
  ignoreNote: string;
  footer: string;
}> = {
  en: {
    verifyTitle: 'Verify your email address',
    verifyBody: 'Welcome to Chukta! Please confirm your email address by clicking the button below.',
    verifyButton: 'Verify Email',
    verifyExpiry: 'This link will expire in 24 hours and can only be used once.',
    resetTitle: 'Reset your password',
    resetBody: 'We received a request to reset your password. Click the button below to set a new password.',
    resetButton: 'Reset Password',
    resetExpiry: 'This link will expire in 1 hour and can only be used once.',
    suspiciousTitle: 'Was this you? New login detected',
    suspiciousBody: 'We detected a new login to your account. If this was you, you can safely ignore this message.',
    suspiciousTime: 'Time',
    suspiciousIp: 'IP Address',
    suspiciousDevice: 'Device',
    suspiciousAction: 'If you did not log in, please reset your password immediately.',
    digestTitle: 'Your Weekly Summary',
    digestBody: 'Here is your weekly financial activity recap across your groups.',
    digestOwed: 'You are owed',
    digestOwe: 'You owe',
    digestButton: 'Open Dashboard',
    paymentTitle: 'Payment Recorded',
    paymentBody: 'A payment has been recorded for your group.',
    ignoreNote: 'If you did not request this email, please ignore it.',
    footer: 'Chukta - Smart Group Expense Splitter with India-first UPI Settlement'
  },
  hi: {
    verifyTitle: 'अपना ईमेल पता सत्यापित करें',
    verifyBody: 'Chukta में आपका स्वागत है! कृपया नीचे दिए गए बटन पर क्लिक करके अपना ईमेल सत्यापित करें।',
    verifyButton: 'ईमेल सत्यापित करें',
    verifyExpiry: 'यह लिंक 24 घंटे में समाप्त हो जाएगा और इसका केवल एक बार उपयोग किया जा सकता है।',
    resetTitle: 'अपना पासवर्ड रीसेट करें',
    resetBody: 'हमें आपका पासवर्ड रीसेट करने का अनुरोध प्राप्त हुआ है। नया पासवर्ड सेट करने के लिए नीचे क्लिक करें।',
    resetButton: 'पासवर्ड रीसेट करें',
    resetExpiry: 'यह लिंक 1 घंटे में समाप्त हो जाएगा।',
    suspiciousTitle: 'क्या यह आप थे? नया लॉगिन मिला',
    suspiciousBody: 'आपके खाते में एक नया लॉगिन देखा गया है। यदि यह आप थे, तो चिंता की कोई बात नहीं।',
    suspiciousTime: 'समय',
    suspiciousIp: 'आईपी पता',
    suspiciousDevice: 'डिवाइस',
    suspiciousAction: 'यदि आपने लॉगिन नहीं किया था, तो तुरंत अपना पासवर्ड बदलें।',
    digestTitle: 'आपका साप्ताहिक सारांश',
    digestBody: 'यहाँ आपके सभी ग्रुपों की इस सप्ताह की वित्तीय गतिविधि का विवरण है।',
    digestOwed: 'आपको मिलना है',
    digestOwe: 'आपको देना है',
    digestButton: 'डैशबोर्ड खोलें',
    paymentTitle: 'भुगतान दर्ज किया गया',
    paymentBody: 'आपके ग्रुप के लिए एक नया भुगतान दर्ज किया गया है।',
    ignoreNote: 'यदि आपने यह अनुरोध नहीं किया था, तो कृपया इसे अनदेखा करें।',
    footer: 'Chukta - भारत के लिए स्मार्ट ग्रुप खर्च बांटने वाला ऐप'
  },
  bn: {
    verifyTitle: 'আপনার ইমেল ঠিকানা যাচাই করুন',
    verifyBody: 'Chukta-এ স্বাগতম! নীচের বোতামে ক্লিক করে আপনার ইমেল যাচাই করুন।',
    verifyButton: 'ইমেল যাচাই করুন',
    verifyExpiry: 'এই লিঙ্কটি ২৪ ঘন্টার মধ্যে মেয়াদ শেষ হবে।',
    resetTitle: 'পাসওয়ার্ড রিসেট করুন',
    resetBody: 'পাসওয়ার্ড রিসেট করতে নীচের বোতামে ক্লিক করুন।',
    resetButton: 'পাসওয়ার্ড রিসেট',
    resetExpiry: 'এই লিঙ্কটি ১ ঘন্টার মধ্যে মেয়াদ শেষ হবে।',
    suspiciousTitle: 'এটি কি আপনি ছিলেন? নতুন লগইন সনাক্ত হয়েছে',
    suspiciousBody: 'আপনার অ্যাকাউন্টে একটি নতুন লগইন সনাক্ত হয়েছে।',
    suspiciousTime: 'সময়',
    suspiciousIp: 'আইপি ঠিকানা',
    suspiciousDevice: 'ডিভাইস',
    suspiciousAction: 'যদি আপনি না হয়ে থাকেন তবে অবিলম্বে পাসওয়ার্ড পরিবর্তন করুন।',
    digestTitle: 'আপনার সাপ্তাহিক সারাংশ',
    digestBody: 'এই সপ্তাহের গ্রুপের হিসাবের বিবরণ।',
    digestOwed: 'আপনি পাবেন',
    digestOwe: 'আপনাকে দিতে হবে',
    digestButton: 'ড্যাশবোর্ড খুলুন',
    paymentTitle: 'পেমেন্ট নথিভুক্ত হয়েছে',
    paymentBody: 'গ্রুপে একটি পেমেন্ট সম্পন্ন হয়েছে।',
    ignoreNote: 'যদি এটি আপনার দ্বারা অনুরোধ করা না হয় তবে উপেক্ষা করুন।',
    footer: 'Chukta - স্মার্ট গ্রুপ খরচ ভাগ করার প্ল্যাটফর্ম'
  },
  mr: {
    verifyTitle: 'तुमचा ईमेल पत्ता सत्यापित करा',
    verifyBody: 'Chukta मध्ये स्वागत आहे! कृपया खालील बटणावर क्लिक करून ईमेल सत्यापित करा.',
    verifyButton: 'ईमेल सत्यापित करा',
    verifyExpiry: 'हा दुवा २४ तासांत कालबाह्य होईल.',
    resetTitle: 'पासवर्ड रीसेट करा',
    resetBody: 'नवीन पासवर्ड सेट करण्यासाठी खालील बटणावर क्लिक करा.',
    resetButton: 'पासवर्ड रीसेट करा',
    resetExpiry: 'हा दुवा १ तासात कालबाह्य होईल.',
    suspiciousTitle: 'हे तुम्हीच होतात का? नवीन लॉगिन आढळले',
    suspiciousBody: 'तुमच्या खात्यात नवीन लॉगिन आढळले आहे.',
    suspiciousTime: 'वेळ',
    suspiciousIp: 'आयपी पत्ता',
    suspiciousDevice: 'डिव्हाइस',
    suspiciousAction: 'तुम्ही लॉगिन केले नसल्यास त्वरित पासवर्ड बदला.',
    digestTitle: 'तुमचा साप्ताहिक गोषवारा',
    digestBody: 'या आठवड्यातील खर्चाचा सारांश.',
    digestOwed: 'तुम्हाला मिळणे बाकी',
    digestOwe: 'तुम्हाला देणे बाकी',
    digestButton: 'डॅशबोर्ड उघडा',
    paymentTitle: 'पेमेंट नोंदवले गेले',
    paymentBody: 'ग्रुपमध्ये नवीन पेमेंट नोंदवले गेले आहे.',
    ignoreNote: 'तुम्ही ही विनंती केली नसल्यास दुर्लक्ष करा.',
    footer: 'Chukta - हिशोब चुकता करण्याचे सोपे माध्यम'
  },
  ta: {
    verifyTitle: 'உங்கள் மின்னஞ்சலை சரிபார்க்கவும்',
    verifyBody: 'Chukta-விற்கு வரவேற்கிறோம்! மின்னஞ்சலை உறுதிப்படுத்த கீழே கிளிக் செய்யவும்.',
    verifyButton: 'மின்னஞ்சல் உறுதிசெய்',
    verifyExpiry: 'இந்த இணைப்பு 24 மணிநேரத்தில் காலாவதியாகும்.',
    resetTitle: 'கடவுச்சொல்லை மீட்டமைக்கவும்',
    resetBody: 'புதிய கடவுச்சொல்லை அமைக்க கீழே உள்ள பொத்தானைக் கிளிக் செய்யவும்.',
    resetButton: 'மீட்டமை',
    resetExpiry: 'இந்த இணைப்பு 1 மணிநேரத்தில் காலாவதியாகும்.',
    suspiciousTitle: 'இது நீங்களா? புதிய உள்நுழைவு கண்டறியப்பட்டது',
    suspiciousBody: 'உங்கள் கணக்கில் புதிய உள்நுழைவு கண்டறியப்பட்டது.',
    suspiciousTime: 'நேரம்',
    suspiciousIp: 'IP முகவரி',
    suspiciousDevice: 'சாதனம்',
    suspiciousAction: 'நீங்கள் உள்நுழையவில்லை என்றால் உடனடியாக கடவுச்சொல்லை மாற்றவும்.',
    digestTitle: 'வாராந்திர சுருக்கம்',
    digestBody: 'இந்த வார குழு செலவுகளின் சுருக்கம்.',
    digestOwed: 'உங்களுக்கு வரவேண்டியது',
    digestOwe: 'நீங்கள் கொடுக்க வேண்டியது',
    digestButton: 'டாஷ்போர்டைத் திறக்கவும்',
    paymentTitle: 'பணம் பதிவு செய்யப்பட்டது',
    paymentBody: 'குழுவில் புதிய கட்டணம் பதிவு செய்யப்பட்டுள்ளது.',
    ignoreNote: 'நீங்கள் கோரவில்லை என்றால் புறக்கணிக்கவும்.',
    footer: 'Chukta - ஸ்மார்ட் செலவு பகிர்வு தளம்'
  },
  te: {
    verifyTitle: 'మీ ఇమెయిల్ చిరునామాను ధృవీకరించండి',
    verifyBody: 'Chukta కు స్వాగతం! ఇమెయిల్‌ను ధృవీకరించడానికి క్రింది బటన్‌ను క్లిక్ చేయండి.',
    verifyButton: 'ధృవీకరించండి',
    verifyExpiry: 'ఈ లింక్ 24 గంటల్లో ముగుస్తుంది.',
    resetTitle: 'పాస్‌వర్డ్‌ను రీసెట్ చేయండి',
    resetBody: 'కొత్త పాస్‌వర్డ్‌ను సెట్ చేయడానికి క్రింద క్లిక్ చేయండి.',
    resetButton: 'రీసెట్ చేయండి',
    resetExpiry: 'ఈ లింక్ 1 గంటలో ముగుస్తుంది.',
    suspiciousTitle: 'ఇది మీరేనా? కొత్త లాగిన్ గుర్తించబడింది',
    suspiciousBody: 'మీ ఖాతాలో కొత్త లాగిన్ గుర్తించబడింది.',
    suspiciousTime: 'సమయం',
    suspiciousIp: 'IP చిరునామా',
    suspiciousDevice: 'పరికరం',
    suspiciousAction: 'మీరు లాగిన్ అవ్వకపోతే వెంటనే పాస్‌వర్డ్‌ను మార్చండి.',
    digestTitle: 'మీ వారపు సారాంశం',
    digestBody: 'ఈ వారం గ్రూప్ ఖర్చుల వివరాలు.',
    digestOwed: 'మీకు రావలసినది',
    digestOwe: 'మీరు చెల్లించవలసినది',
    digestButton: 'డాష్‌బోర్డ్ తెరవండి',
    paymentTitle: 'చెల్లింపు రికార్డ్ చేయబడింది',
    paymentBody: 'గ్రూప్‌లో కొత్త చెల్లింపు నమోదైంది.',
    ignoreNote: 'మీరు అభ్యర్థించకపోతే విస్మరించండి.',
    footer: 'Chukta - సులభమైన ఖర్చుల పంపకం వేదిక'
  },
  kn: {
    verifyTitle: 'ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸವನ್ನು ಪರಿಶೀಲಿಸಿ',
    verifyBody: 'Chukta ಗೆ ಸುಸ್ವಾಗತ! ದೃಢೀಕರಿಸಲು ಕೆಳಗಿನ ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.',
    verifyButton: 'ಪರಿಶೀಲಿಸಿ',
    verifyExpiry: 'ಈ ಲಿಂಕ್ 24 ಗಂಟೆಗಳಲ್ಲಿ ಮುಕ್ತಾಯಗೊಳ್ಳುತ್ತದೆ.',
    resetTitle: 'ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಿ',
    resetBody: 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸಲು ಕೆಳಗೆ ಕ್ಲಿಕ್ ಮಾಡಿ.',
    resetButton: 'ಮರುಹೊಂದಿಸಿ',
    resetExpiry: 'ಈ ಲಿಂಕ್ 1 ಗಂಟೆಯಲ್ಲಿ ಮುಕ್ತಾಯಗೊಳ್ಳುತ್ತದೆ.',
    suspiciousTitle: 'ಇದು ನೀವೇನಾ? ಹೊಸ ಲಾಗಿನ್ ಪತ್ತೆಯಾಗಿದೆ',
    suspiciousBody: 'ನಿಮ್ಮ ಖಾತೆಗೆ ಹೊಸ ಲಾಗಿನ್ ಕಂಡುಬಂದಿದೆ.',
    suspiciousTime: 'ಸಮಯ',
    suspiciousIp: 'IP ವಿಳಾಸ',
    suspiciousDevice: 'ಸಾಧನ',
    suspiciousAction: 'ನೀವು ಲಾಗಿನ್ ಆಗದಿದ್ದರೆ ತಕ್ಷಣ ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ.',
    digestTitle: 'ವಾರದ ಸಾರಾಂಶ',
    digestBody: 'ಈ ವಾರದ ಗುಂಪು ವೆಚ್ಚಗಳ ವಿವರಣೆ.',
    digestOwed: 'ನಿಮಗೆ ಬರಬೇಕಾದದ್ದು',
    digestOwe: 'ನೀವು ನೀಡಬೇಕಾದದ್ದು',
    digestButton: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ',
    paymentTitle: 'ಪಾವತಿ ದಾಖಲಿಸಲಾಗಿದೆ',
    paymentBody: 'ಗುಂಪಿನಲ್ಲಿ ಹೊಸ ಪಾವತಿ ದಾಖಲಾಗಿದೆ.',
    ignoreNote: 'ನೀವು ವಿನಂತಿಸದಿದ್ದರೆ ನಿರ್ಲಕ್ಷಿಸಿ.',
    footer: 'Chukta - ವೆಚ್ಚ ಹಂಚಿಕೆ ವೇದಿಕೆ'
  },
  ml: {
    verifyTitle: 'നിങ്ങളുടെ ഇമെയിൽ സ്ഥിരീകരിക്കുക',
    verifyBody: 'Chukta-ലേക്ക് സ്വാഗതം! ഇമെയിൽ സ്ഥിരീകരിക്കാൻ താഴെ ക്ലിക്ക് ചെയ്യുക.',
    verifyButton: 'സ്ഥിരീകരിക്കുക',
    verifyExpiry: 'ഈ ലിങ്ക് 24 മണിക്കൂറിനുള്ളിൽ കാലഹരണപ്പെടും.',
    resetTitle: 'പാസ്‌വേഡ് പുനഃസജ്ജമാക്കുക',
    resetBody: 'പുതിയ പാസ്‌വേഡ് സജ്ജമാക്കാൻ താഴെ ക്ലിക്ക് ചെയ്യുക.',
    resetButton: 'പുനഃസജ്ജമാക്കുക',
    resetExpiry: 'ഈ ലിങ്ക് 1 മണിക്കൂറിനുള്ളിൽ കാലഹരണപ്പെടും.',
    suspiciousTitle: 'ഇത് നിങ്ങളാണോ? പുതിയ ലോഗിൻ കണ്ടെത്തി',
    suspiciousBody: 'നിങ്ങളുടെ അക്കൗണ്ടിലേക്ക് ഒരു പുതിയ ലോഗിൻ കണ്ടെത്തി.',
    suspiciousTime: 'സമയം',
    suspiciousIp: 'IP വിലാസം',
    suspiciousDevice: 'ഉപകരണം',
    suspiciousAction: 'നിങ്ങൾ അല്ലങ്കിൽ ഉടൻ പാസ്‌വേഡ് മാറ്റുക.',
    digestTitle: 'പ്രതിവാര സംഗ്രഹം',
    digestBody: 'ഈ ആഴ്ചയിലെ ഗ്രൂപ്പ് ചെലവുകളുടെ സംഗ്രഹം.',
    digestOwed: 'നിങ്ങൾക്ക് ലഭിക്കാനുള്ളത്',
    digestOwe: 'നിങ്ങൾ നൽകാനുള്ളത്',
    digestButton: 'ഡാഷ്‌ബോർഡ് തുറക്കുക',
    paymentTitle: 'പേയ്‌മെന്റ് രേഖപ്പെടുത്തി',
    paymentBody: 'ഗ്രൂപ്പിൽ പുതിയ പേയ്‌മെന്റ് രേഖപ്പെടുത്തി.',
    ignoreNote: 'നിങ്ങൾ അഭ്യർത്ഥിച്ചില്ലെങ്കിൽ അവഗണിക്കുക.',
    footer: 'Chukta - മികച്ച ചെലവ് പങ്കിടൽ ആപ്പ്'
  },
  gu: {
    verifyTitle: 'તમારું ઇમેઇલ ચકાસો',
    verifyBody: 'Chukta માં આપનું સ્વાગત છે! નીચેના બટન પર ક્લિક કરીને ઇમેઇલ ચકાસો.',
    verifyButton: 'ઇમેઇલ ચકાસો',
    verifyExpiry: 'આ લિંક 24 કલાકમાં સમાપ્ત થઈ જશે.',
    resetTitle: 'પાસવર્ડ રીસેટ કરો',
    resetBody: 'નવો પાસવર્ડ સેટ કરવા માટે નીચે ક્લિક કરો.',
    resetButton: 'પાસવર્ડ રીસેટ કરો',
    resetExpiry: 'આ લિંક 1 કલાકમાં સમાપ્ત થઈ જશે.',
    suspiciousTitle: 'શું આ તમે હતા? નવું લોગિન મળ્યું',
    suspiciousBody: 'તમારા ખાતામાં નવું લોગિન જોવા મળ્યું છે.',
    suspiciousTime: 'સમય',
    suspiciousIp: 'IP સરનામું',
    suspiciousDevice: 'ડિવાઇસ',
    suspiciousAction: 'જો તમે લોગિન ન કર્યું હોય તો તાત્કાલિક પાસવર્ડ બદલો.',
    digestTitle: 'તમારો સાપ્તાહિક સારાંશ',
    digestBody: 'આ અઠવાડિયે તમારા ગ્રુપના ખર્ચની વિગતો.',
    digestOwed: 'તમને મળવાપાત્ર રકમ',
    digestOwe: 'તમારે ચૂકવવાપાત્ર રકમ',
    digestButton: 'ડેશબોર્ડ ખોલો',
    paymentTitle: 'ચુકવણી નોંધાઈ',
    paymentBody: 'ગ્રુપમાં નવી ચુકવણી નોંધવામાં આવી છે.',
    ignoreNote: 'જો તમે વિનંતી ન કરી હોય તો અવગણો.',
    footer: 'Chukta - સરળ હિસાબ ચુકવણી એપ્લિકેશન'
  },
  pa: {
    verifyTitle: 'ਆਪਣਾ ਈਮੇਲ ਤਸਦੀਕ ਕਰੋ',
    verifyBody: 'Chukta ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ! ਹੇਠਾਂ ਦਿੱਤੇ ਬਟਨ ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਈਮੇਲ ਤਸਦੀਕ ਕਰੋ।',
    verifyButton: 'ਈਮੇਲ ਤਸਦੀਕ ਕਰੋ',
    verifyExpiry: 'ਇਹ ਲਿੰਕ 24 ਘੰਟਿਆਂ ਵਿੱਚ ਸਮਾਪਤ ਹੋ ਜਾਵੇਗਾ।',
    resetTitle: 'ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਕਰੋ',
    resetBody: 'ਨਵਾਂ ਪਾਸਵਰਡ ਸੈੱਟ ਕਰਨ ਲਈ ਹੇਠਾਂ ਕਲਿੱਕ ਕਰੋ।',
    resetButton: 'ਰੀਸੈੱਟ ਕਰੋ',
    resetExpiry: 'ਇਹ ਲਿੰਕ 1 ਘੰਟੇ ਵਿੱਚ ਸਮਾਪਤ ਹੋ ਜਾਵੇਗਾ।',
    suspiciousTitle: 'ਕੀ ਇਹ ਤੁਸੀਂ ਸੀ? ਨਵਾਂ ਲੌਗਇਨ ਮਿਲਿਆ',
    suspiciousBody: 'ਤੁਹਾਡੇ ਖਾਤੇ ਵਿੱਚ ਨਵਾਂ ਲੌਗਇਨ ਦੇਖਿਆ ਗਿਆ ਹੈ।',
    suspiciousTime: 'ਸਮਾਂ',
    suspiciousIp: 'IP ਪਤਾ',
    suspiciousDevice: 'ਡਿਵਾਈਸ',
    suspiciousAction: 'ਜੇਕਰ ਤੁਸੀਂ ਲੌਗਇਨ ਨਹੀਂ ਕੀਤਾ ਸੀ, ਤਾਂ ਤੁਰੰਤ ਪਾਸਵਰਡ ਬਦਲੋ।',
    digestTitle: 'ਤੁਹਾਡਾ ਹਫ਼ਤਾਵਾਰੀ ਸਾਰ',
    digestBody: 'ਇਸ ਹਫ਼ਤੇ ਦੇ ਗਰੁੱਪ ਖਰਚਿਆਂ ਦਾ ਵੇਰਵਾ।',
    digestOwed: 'ਤੁਹਾਨੂੰ ਮਿਲਣਯੋਗ',
    digestOwe: 'ਤੁਹਾਡੇ ਵੱਲ ਦੇਣਯੋਗ',
    digestButton: 'ਡੈਸ਼ਬੋਰਡ ਖੋਲ੍ਹੋ',
    paymentTitle: 'ਭੁਗਤਾਨ ਦਰਜ ਹੋਇਆ',
    paymentBody: 'ਗਰੁੱਪ ਵਿੱਚ ਨਵਾਂ ਭੁਗਤਾਨ ਦਰਜ ਹੋਇਆ ਹੈ।',
    ignoreNote: 'ਜੇਕਰ ਤੁਸੀਂ ਬੇਨਤੀ ਨਹੀਂ ਕੀਤੀ ਸੀ ਤਾਂ ਅਣਦੇਖਾ ਕਰੋ।',
    footer: 'Chukta - ਸਮਾਰਟ ਹਿਸਾਬ ਕਿਤਾਬ ਐਪ'
  }
};

function getStrings(locale?: string) {
  const loc = (locale && locale in EMAIL_STRINGS ? locale : 'en') as SupportedLocale;
  return EMAIL_STRINGS[loc] || EMAIL_STRINGS.en;
}

function baseHtmlWrapper(title: string, contentHtml: string, footerText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
    .header { background: linear-gradient(135deg, #0d9488, #4f46e5); padding: 32px 24px; text-align: center; color: #ffffff; }
    .logo { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 8px; letter-spacing: 1px; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 15px; }
    .h1 { font-size: 20px; font-weight: 800; margin: 0 0 16px; color: #0f172a; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #0d9488; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25); }
    .box { background: #f1f5f9; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .box-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
    .box-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 700; }
    .note { font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center; line-height: 1.5; }
    .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; text-align: center; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ ${APP_NAME}</div>
      <div class="badge">Security & Trust</div>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Email Verification Template
 */
export function renderVerifyEmail(data: { name: string; url: string; locale?: string }): EmailRenderOutput {
  const s = getStrings(data.locale);
  const subject = `${s.verifyTitle} - ${APP_NAME}`;
  const html = baseHtmlWrapper(
    subject,
    `
      <h2 class="h1">${s.verifyTitle}</h2>
      <p>Hi ${data.name},</p>
      <p>${s.verifyBody}</p>
      <div class="btn-container">
        <a href="${data.url}" class="btn" target="_blank">${s.verifyButton}</a>
      </div>
      <p style="font-size: 13px; color: #64748b; text-align: center;">${s.verifyExpiry}</p>
      <p class="note">${s.ignoreNote}</p>
    `,
    s.footer
  );

  const text = `Hi ${data.name},\n\n${s.verifyTitle}\n${s.verifyBody}\n\nVerify URL: ${data.url}\n\n${s.verifyExpiry}\n\n${s.ignoreNote}\n\n---\n${s.footer}`;

  return { subject, html, text };
}

/**
 * 2. Password Reset Template
 */
export function renderPasswordReset(data: { name: string; url: string; locale?: string }): EmailRenderOutput {
  const s = getStrings(data.locale);
  const subject = `${s.resetTitle} - ${APP_NAME}`;
  const html = baseHtmlWrapper(
    subject,
    `
      <h2 class="h1">${s.resetTitle}</h2>
      <p>Hi ${data.name},</p>
      <p>${s.resetBody}</p>
      <div class="btn-container">
        <a href="${data.url}" class="btn" target="_blank">${s.resetButton}</a>
      </div>
      <p style="font-size: 13px; color: #64748b; text-align: center;">${s.resetExpiry}</p>
      <p class="note">${s.ignoreNote}</p>
    `,
    s.footer
  );

  const text = `Hi ${data.name},\n\n${s.resetTitle}\n${s.resetBody}\n\nReset URL: ${data.url}\n\n${s.resetExpiry}\n\n${s.ignoreNote}\n\n---\n${s.footer}`;

  return { subject, html, text };
}

/**
 * 3. Suspicious / New Login Alert Template
 */
export function renderSuspiciousLogin(data: {
  name: string;
  ip: string;
  device: string;
  time: string;
  locale?: string;
}): EmailRenderOutput {
  const s = getStrings(data.locale);
  const subject = `⚠️ ${s.suspiciousTitle} - ${APP_NAME}`;
  const html = baseHtmlWrapper(
    subject,
    `
      <h2 class="h1" style="color: #b91c1c;">⚠️ ${s.suspiciousTitle}</h2>
      <p>Hi ${data.name},</p>
      <p>${s.suspiciousBody}</p>
      <div class="box">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 500;">${s.suspiciousTime}:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">${data.time}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 500;">${s.suspiciousIp}:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">${data.ip}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 500;">${s.suspiciousDevice}:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">${data.device}</td>
          </tr>
        </table>
      </div>
      <p style="color: #b91c1c; font-weight: 600; font-size: 13px; text-align: center;">${s.suspiciousAction}</p>
    `,
    s.footer
  );

  const text = `Hi ${data.name},\n\n${s.suspiciousTitle}\n${s.suspiciousBody}\n\nTime: ${data.time}\nIP: ${data.ip}\nDevice: ${data.device}\n\n${s.suspiciousAction}\n\n---\n${s.footer}`;

  return { subject, html, text };
}

/**
 * 4. Weekly Digest Template
 */
export function renderWeeklyDigest(data: {
  name: string;
  owedRupees: number;
  oweRupees: number;
  activeGroups: number;
  url: string;
  locale?: string;
}): EmailRenderOutput {
  const s = getStrings(data.locale);
  const subject = `📊 ${s.digestTitle} - ${APP_NAME}`;
  const html = baseHtmlWrapper(
    subject,
    `
      <h2 class="h1">📊 ${s.digestTitle}</h2>
      <p>Hi ${data.name},</p>
      <p>${s.digestBody}</p>
      <div style="display: flex; gap: 12px; margin: 24px 0;">
        <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 12px; color: #065f46; font-weight: 600;">${s.digestOwed}</div>
          <div style="font-size: 22px; color: #047857; font-weight: 800; margin-top: 4px;">₹${data.owedRupees.toLocaleString('en-IN')}</div>
        </div>
        <div style="flex: 1; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 12px; color: #9f1239; font-weight: 600;">${s.digestOwe}</div>
          <div style="font-size: 22px; color: #e11d48; font-weight: 800; margin-top: 4px;">₹${data.oweRupees.toLocaleString('en-IN')}</div>
        </div>
      </div>
      <div class="btn-container">
        <a href="${data.url}" class="btn" target="_blank">${s.digestButton}</a>
      </div>
    `,
    s.footer
  );

  const text = `Hi ${data.name},\n\n${s.digestTitle}\n${s.digestBody}\n\nYou are owed: ₹${data.owedRupees}\nYou owe: ₹${data.oweRupees}\n\nDashboard: ${data.url}\n\n---\n${s.footer}`;

  return { subject, html, text };
}
