import { useTranslation } from 'react-i18next'
import { useDossier } from '@/app/providers/DossierProvider'
import { getAllCountryConfigs } from '@/config/countries'
import { SCHEMA_VERSION } from '@/domain/schemas/dossier.schema'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/ui/page-header'
import { PageBody } from '@/components/ui/section'
import { Field } from '@/components/ui/field'
import { LanguageSelect } from '@/components/ui/language-select'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AlertTriangle, Trash2, Shield, Globe, Languages } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { dynamicT } from '@/lib/i18n-dynamic'

export default function SettingsPage() {
  const { state, reset, updateApplication, hasData } = useDossier()
  const { t } = useTranslation(['settings', 'common'])
  const td = dynamicT(t)
  const countries = getAllCountryConfigs()

  const handleCountryChange = (countryCode: string) => {
    updateApplication({ destinationCountry: countryCode })
  }

  const handleReset = () => {
    reset()
  }

  return (
    <PageBody>
      <PageHeader
        title={t('settings:title')}
        description={t('settings:description')}
      />

      {/* Language and appearance — the only preferences VisaFlow stores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages aria-hidden className="size-4 opacity-70" />
            {t('settings:appearance.title')}
          </CardTitle>
          <CardDescription>
            {t('settings:appearance.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t('settings:appearance.languageLabel')}
            description={t('settings:appearance.languageHint')}
            htmlFor="settings-language"
          >
            <div>
              <LanguageSelect />
            </div>
          </Field>
          <Field
            label={t('settings:appearance.themeLabel')}
            description={t('settings:appearance.themeHint')}
            htmlFor="settings-theme"
          >
            <div>
              <ThemeToggle />
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* Why these two preferences may persist at all */}
      <Alert variant="info">
        <Shield />
        <AlertTitle>{t('settings:preferencePrivacy.title')}</AlertTitle>
        <AlertDescription>
          {t('settings:preferencePrivacy.body')}
        </AlertDescription>
      </Alert>

      {/* Destination country */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe aria-hidden className="size-4 opacity-70" />
              {t('settings:country.title')}
            </CardTitle>
            <CardDescription>
              {t('settings:country.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={state.application?.destinationCountry ?? ''}
              onValueChange={handleCountryChange}
            >
              <SelectTrigger
                className="w-full md:w-80"
                aria-label={t('settings:country.title')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countries.map((config) => (
                  <SelectItem
                    key={config.countryCode}
                    value={config.countryCode}
                  >
                    {td(config.nameKey)}
                    {config.visaTypes[0]
                      ? ` — ${td(config.visaTypes[0].nameKey)}`
                      : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-caption text-muted-foreground mt-2">
              {t('settings:country.hint')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data management */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:data.title')}</CardTitle>
          <CardDescription>{t('settings:data.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <div>
            <h3 className="text-eyebrow text-muted-foreground mb-2 uppercase">
              {t('settings:dangerZone')}
            </h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 />
                  {t('settings:reset.action')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('settings:reset.confirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('settings:reset.confirmBody')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t('common:actions.cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>
                    {t('settings:reset.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle aria-hidden className="size-4 opacity-70" />
            {t('settings:disclaimer.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4">
          <p className="text-body">{t('settings:disclaimer.p1')}</p>
          <p className="text-body">{t('settings:disclaimer.p2')}</p>
          <p className="text-body">{t('settings:disclaimer.p3')}</p>
          <p className="text-body">{t('settings:disclaimer.noPrediction')}</p>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:about.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-body">
            <span className="font-medium">{t('settings:about.version')}:</span>{' '}
            <span data-numeric>0.1.0</span>
          </p>
          <p className="text-body">
            <span className="font-medium">
              {t('settings:about.schemaVersion')}:
            </span>{' '}
            <span data-numeric>{SCHEMA_VERSION}</span>
          </p>
          <p className="text-body text-muted-foreground">
            {t('settings:about.summary')}
          </p>
          <p className="text-body text-muted-foreground">
            {t('settings:about.license')}
          </p>
        </CardContent>
      </Card>
    </PageBody>
  )
}
