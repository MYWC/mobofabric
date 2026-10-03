export const discountsLang = {
  fa: {
    // Label
    inputLabel:       'کد تخفیف دارید؟',
    inputPlaceholder: 'کد تخفیف را وارد کنید',
    apply:            'اعمال',
    applying:         'در حال بررسی...',
    remove:           'حذف کد تخفیف',

    // Row در خلاصه سفارش
    codeDiscountLabel:'تخفیف کد',

    // Success
    applied:          'کد تخفیف اعمال شد',
    removed:          'کد تخفیف حذف شد',
    autoRemoved:      'کد «{code}» به دلیل عدم تطابق شرایط حذف شد',

    // Errors
    errEmpty:         'لطفاً کد تخفیف را وارد کنید.',
    errNotFound:      'کد تخفیف یافت نشد.',
    errInactive:      'این کد تخفیف غیرفعال است.',
    errNotStarted:    'این کد تخفیف هنوز فعال نشده.',
    errExpired:       'این کد تخفیف منقضی شده است.',
    errLimit:         'ظرفیت استفاده از این کد پر شده است.',
    errMinAmount:     'حداقل مبلغ سفارش برای این کد {amount} است.',
    errGeneric:       'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
  },

  en: {
    inputLabel:       'Have a discount code?',
    inputPlaceholder: 'Enter discount code',
    apply:            'Apply',
    applying:         'Checking...',
    remove:           'Remove discount code',

    codeDiscountLabel:'Code discount',

    applied:          'Discount code applied',
    removed:          'Discount code removed',
    autoRemoved:      'Code "{code}" was removed because conditions no longer met',

    errEmpty:         'Please enter a discount code.',
    errNotFound:      'Discount code not found.',
    errInactive:      'This code is inactive.',
    errNotStarted:    'This code is not active yet.',
    errExpired:       'This code has expired.',
    errLimit:         'This code has reached its usage limit.',
    errMinAmount:     'Minimum order amount for this code is {amount}.',
    errGeneric:       'Something went wrong. Please try again.',
  },
};