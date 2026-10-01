; The license page shows a checkbox to tick before "Next" is enabled,
; instead of NSIS's default "I Agree" button.
!define MUI_LICENSEPAGE_CHECKBOX

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend
