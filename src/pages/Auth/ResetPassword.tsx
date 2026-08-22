import React from 'react'
import { useTranslation } from 'react-i18next'

const ResetPassword:React.FC = () => {
  const { t } = useTranslation()
  return (
    <div>
      <h1>{t("reset_password", "reset password")}</h1>
    </div>
  )
}

export default ResetPassword
