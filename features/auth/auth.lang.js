// ═══════════════════════════════════════════════════════════
//  Auth — ترجمه‌ها (Phase 19 — Redesign)
// ═══════════════════════════════════════════════════════════

export const authLang = {
  fa: {
    // ── Login ──
    loginTitle:    'ورود به حساب',
    loginSubtitle: 'خوش آمدید! وارد شوید.',
    email:         'ایمیل',
    emailPlaceholder: 'you@example.com',
    password:      'رمز عبور',
    passwordPlaceholder: '••••••••',
    login:         'ورود',
    loggingIn:     'در حال ورود...',
    showPassword:  'نمایش رمز',
    hidePassword:  'پنهان کردن رمز',

    // ── Signup ──
    signupTitle:   'ساخت حساب جدید',
    signupSubtitle:'چند ثانیه بیشتر طول نمی‌کشه.',
    fullName:      'نام و نام خانوادگی',
    fullNamePlaceholder: 'مثلاً: علی محمدی',
    signup:        'ثبت‌نام',
    signingUp:     'در حال ثبت‌نام...',

    // ── Switch ──
    noAccount:     'حساب نداری؟',
    haveAccount:   'حساب داری؟',
    switchToSignup:'ثبت‌نام کن',
    switchToLogin: 'وارد شو',

    // ── Errors ──
    errEmail:        'لطفاً ایمیل خود را وارد کنید.',
    errEmailInvalid: 'ایمیل معتبر نیست.',
    errPassword:     'لطفاً رمز عبور را وارد کنید.',
    errPasswordShort:'رمز عبور باید حداقل ۶ کاراکتر باشد.',
    errName:         'لطفاً نام خود را وارد کنید.',
    errNameShort:    'نام باید حداقل ۲ حرف باشد.',
    errInvalidCreds: 'ایمیل یا رمز عبور اشتباه است.',
    errEmailTaken:   'این ایمیل قبلاً ثبت شده است.',
    errWeakPassword: 'رمز عبور ضعیف است. حداقل ۶ کاراکتر.',
    errGeneric:      'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
    errTerms:        'لطفاً قوانین را بپذیرید.',
    fieldRequired:   'این فیلد الزامی است.',

    // ── Success ──
    loginSuccess:    'با موفقیت وارد شدید.',
    signupSuccess:   'حساب شما ساخته شد. خوش آمدید!',
    logoutSuccess:   'از حساب خود خارج شدید.',
    emailConfirmHint:'ایمیلی برای تأیید حساب ارسال شد. لطفاً صندوق ورودی را بررسی کنید.',

    // ── Menu (header) ──
    menu:            'حساب کاربری',
    account:         'حساب من',
    adminPanel:      'پنل مدیریت',
    logout:          'خروج',
    loginLink:       'ورود',

    // ── Redesign — Side A (Hero) ──
    splitTitle:      'به Phone Store خوش آمدی',
    splitSubtitle:   'بهترین گوشی‌های روز دنیا، با ضمانت اصالت و قیمت شفاف.',
    statCustomers:      '۵۰٬۰۰۰+',
    statCustomersLabel: 'مشتری راضی',
    statRating:         '۴.۹ از ۵',
    statRatingLabel:    'امتیاز کاربران',
    benefit1: 'ضمانت ۱۰۰٪ اصالت',
    benefit2: 'ارسال سریع ۲۴ ساعته',
    benefit3: 'پشتیبانی ۲۴/۷',
    benefit4: 'پرداخت امن',

    // ── Redesign — Side B (Form) ──
    welcomeBack:     'خوش آمدی! 👋',
    welcomeBackSub:  'برای ادامه، وارد حساب خود شو',
    createAccountSub:'چند ثانیه‌ای حساب بساز و شروع کن',
    orContinueWith:  'یا ادامه بده با',
    forgotPassword:  'فراموشی رمز؟',
    rememberMe:      'یادت باشه',
    termsAgree:      'با ثبت‌نام، قوانین و حریم خصوصی را می‌پذیرم',

    // ── Password Strength ──
    passwordStrength:   'قدرت رمز',
    passwordWeak:       'ضعیف',
    passwordMedium:     'متوسط',
    passwordStrong:     'قوی',
    passwordVeryStrong: 'بسیار قوی',

    // ── Password Strength — Checklist ──
    pwsCheckLength:    'حداقل ۸ حرف',
    pwsCheckUppercase: 'حرف بزرگ',
    pwsCheckLowercase: 'حرف کوچک',
    pwsCheckDigit:     'عدد',
    pwsCheckSpecial:   'کاراکتر خاص',

    // ── Social ──
    socialGoogle: 'ورود با گوگل',
    socialGitHub: 'ورود با گیت‌هاب',
    socialApple:  'ورود با اپل',
  },

  en: {
    // ── Login ──
    loginTitle:    'Sign in',
    loginSubtitle: 'Welcome back! Please sign in.',
    email:         'Email',
    emailPlaceholder: 'you@example.com',
    password:      'Password',
    passwordPlaceholder: '••••••••',
    login:         'Sign in',
    loggingIn:     'Signing in...',
    showPassword:  'Show password',
    hidePassword:  'Hide password',

    // ── Signup ──
    signupTitle:   'Create your account',
    signupSubtitle:'It only takes a moment.',
    fullName:      'Full name',
    fullNamePlaceholder: 'e.g., Ali Mohammadi',
    signup:        'Sign up',
    signingUp:     'Creating account...',

    // ── Switch ──
    noAccount:     'Don\'t have an account?',
    haveAccount:   'Already have an account?',
    switchToSignup:'Sign up',
    switchToLogin: 'Sign in',

    // ── Errors ──
    errEmail:        'Please enter your email.',
    errEmailInvalid: 'Email is not valid.',
    errPassword:     'Please enter your password.',
    errPasswordShort:'Password must be at least 6 characters.',
    errName:         'Please enter your name.',
    errNameShort:    'Name must be at least 2 characters.',
    errInvalidCreds: 'Invalid email or password.',
    errEmailTaken:   'This email is already registered.',
    errWeakPassword: 'Password is too weak. Minimum 6 characters.',
    errGeneric:      'Something went wrong. Please try again.',
    errTerms:        'Please accept the terms.',
    fieldRequired:   'This field is required.',

    // ── Success ──
    loginSuccess:    'Signed in successfully.',
    signupSuccess:   'Account created. Welcome!',
    logoutSuccess:   'Signed out.',
    emailConfirmHint:'A confirmation email has been sent. Please check your inbox.',

    // ── Menu (header) ──
    menu:            'Account',
    account:         'My account',
    adminPanel:      'Admin panel',
    logout:          'Sign out',
    loginLink:       'Sign in',

    // ── Redesign — Side A (Hero) ──
    splitTitle:      'Welcome to Phone Store',
    splitSubtitle:   'The best phones in the world — authentic, transparent, fast.',
    statCustomers:      '50,000+',
    statCustomersLabel: 'Happy customers',
    statRating:         '4.9 / 5',
    statRatingLabel:    'User rating',
    benefit1: '100% authenticity guarantee',
    benefit2: 'Fast 24-hour shipping',
    benefit3: '24/7 support',
    benefit4: 'Secure payment',

    // ── Redesign — Side B (Form) ──
    welcomeBack:     'Welcome back! 👋',
    welcomeBackSub:  'Sign in to continue',
    createAccountSub:'Create an account in seconds',
    orContinueWith:  'or continue with',
    forgotPassword:  'Forgot password?',
    rememberMe:      'Remember me',
    termsAgree:      'By signing up, I accept the Terms and Privacy Policy',

    // ── Password Strength ──
    passwordStrength:   'Password strength',
    passwordWeak:       'Weak',
    passwordMedium:     'Medium',
    passwordStrong:     'Strong',
    passwordVeryStrong: 'Very strong',

    // ── Password Strength — Checklist ──
    pwsCheckLength:    'At least 8 chars',
    pwsCheckUppercase: 'Uppercase letter',
    pwsCheckLowercase: 'Lowercase letter',
    pwsCheckDigit:     'Number',
    pwsCheckSpecial:   'Special character',

    // ── Social ──
    socialGoogle: 'Sign in with Google',
    socialGitHub: 'Sign in with GitHub',
    socialApple:  'Sign in with Apple',
  },
};