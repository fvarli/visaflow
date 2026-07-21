import { useDossier } from '@/app/providers/DossierProvider'
import { getAllCountryConfigs } from '@/config/countries'
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
import {
  AlertTriangle,
  Download,
  Trash2,
  Upload,
  Shield,
  Globe,
} from 'lucide-react'
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

export default function SettingsPage() {
  const { state, reset, updateApplication, hasData } = useDossier()
  const countries = getAllCountryConfigs()

  const handleCountryChange = (countryCode: string) => {
    updateApplication({ destinationCountry: countryCode })
  }

  const handleReset = () => {
    reset()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Application settings and data management
        </p>
      </div>

      {/* Privacy Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Privacy</AlertTitle>
        <AlertDescription>
          Your data is stored only in browser memory. No information is sent to
          any server. Export your dossier regularly to save your progress. Data
          is lost when you close the browser or refresh the page.
        </AlertDescription>
      </Alert>

      {/* Destination Country */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Destination Country
            </CardTitle>
            <CardDescription>
              Select the country you are applying to visit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={state.application?.destinationCountry ?? ''}
              onValueChange={handleCountryChange}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    {config.name} - {config.visaType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-sm text-muted-foreground">
              Changing the country will update the document checklist
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Import, export, or reset your application data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Dossier
            </Button>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-2">Danger Zone</h4>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your application data from
                    browser memory. This action cannot be undone. Make sure to
                    export your data first if you want to keep it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>
                    Yes, Reset Everything
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
            <AlertTriangle className="h-5 w-5" />
            Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            VisaFlow is an organizational tool. It does not provide legal
            advice, represent any embassy or visa center, or guarantee a visa
            decision. Always verify requirements using current official sources.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            The document checklists and validation rules are provided as general
            guidance only. Requirements may vary based on your nationality, the
            specific embassy processing your application, and current
            regulations which may change without notice.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Before submitting your visa application, always confirm the
            requirements with the official embassy, consulate, or authorized
            visa center.
          </p>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About VisaFlow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>Version:</strong> 0.1.0
          </p>
          <p className="text-sm">
            <strong>Schema Version:</strong> 1.0.0
          </p>
          <p className="text-sm text-muted-foreground">
            Open-source visa application dossier manager.
          </p>
          <p className="text-sm text-muted-foreground">
            Licensed under MIT License.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
