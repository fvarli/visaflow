import { useMemo } from 'react'
import { useDossier } from '@/app/providers/DossierProvider'
import { runValidation } from '@/domain/rules/runner'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { ValidationFinding } from '@/domain/rules/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { AlertCircle, AlertTriangle, Info, ShieldCheck } from 'lucide-react'

export default function ConsistencyChecksPage() {
  const { state, hasData } = useDossier()

  const validationResult = useMemo(() => {
    if (!hasData || !state.applicant || !state.application) return null

    const dossier: Dossier = {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      applicant: state.applicant,
      application: state.application,
      documents: state.documents,
      sponsors: state.sponsors,
    }

    return runValidation(dossier)
  }, [state, hasData])

  if (!hasData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No application data loaded. Go to Dashboard to start a new
          application.
        </AlertDescription>
      </Alert>
    )
  }

  if (!validationResult) return null

  const { findings, errorCount, warningCount, infoCount } = validationResult

  const getSeverityIcon = (severity: ValidationFinding['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityBadge = (severity: ValidationFinding['severity']) => {
    switch (severity) {
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'warning':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            Warning
          </Badge>
        )
      case 'info':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Info
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consistency Checks</h1>
        <p className="text-muted-foreground">
          Automated validation of your visa application dossier
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{errorCount}</div>
            <p className="text-xs text-muted-foreground">
              Must be resolved before submission
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {warningCount}
            </div>
            <p className="text-xs text-muted-foreground">Should be reviewed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{infoCount}</div>
            <p className="text-xs text-muted-foreground">Informational notes</p>
          </CardContent>
        </Card>
      </div>

      {/* All clear message */}
      {findings.length === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">All checks passed</AlertTitle>
          <AlertDescription className="text-green-700">
            No issues found in your dossier. Remember to verify all information
            is accurate before your appointment.
          </AlertDescription>
        </Alert>
      )}

      {/* Disclaimer */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          These checks are organizational aids, not official requirements.
          Always verify requirements with the official embassy or visa center.
        </AlertDescription>
      </Alert>

      {/* Findings */}
      {findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Findings</CardTitle>
            <CardDescription>
              {findings.length} issue{findings.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {findings.map((finding) => (
                <AccordionItem key={finding.id} value={finding.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      {getSeverityIcon(finding.severity)}
                      <span className="font-medium">{finding.title}</span>
                      {getSeverityBadge(finding.severity)}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pl-8">
                      <p className="text-sm text-muted-foreground">
                        {finding.description}
                      </p>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Suggested Action:</p>
                        <p className="text-sm text-muted-foreground">
                          {finding.suggestedAction}
                        </p>
                      </div>

                      {finding.relatedFields.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Related Fields:</p>
                          <div className="flex flex-wrap gap-1">
                            {finding.relatedFields.map((field) => (
                              <Badge key={field} variant="outline">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
