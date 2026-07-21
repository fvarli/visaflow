import { useState } from 'react'
import { useDossier } from '@/app/providers/DossierProvider'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Plus, Trash2, User } from 'lucide-react'
import { createSponsorId } from '@/domain/types/common'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'

export default function SponsorsPage() {
  const { state, addSponsor, updateSponsor, removeSponsor, hasData } =
    useDossier()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    relationship: '',
    monthlyIncome: '',
    currency: 'EUR',
  })

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      relationship: '',
      monthlyIncome: '',
      currency: 'EUR',
    })
    setEditingSponsor(null)
  }

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.relationship)
      return

    const sponsorData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      relationship: formData.relationship as Sponsor['relationship'],
      monthlyIncome: formData.monthlyIncome
        ? parseFloat(formData.monthlyIncome)
        : undefined,
      currency: formData.currency as Sponsor['currency'],
    }

    if (editingSponsor) {
      updateSponsor(editingSponsor.id, sponsorData)
    } else {
      addSponsor({
        id: createSponsorId(),
        ...sponsorData,
        investments: [],
        ownedAssets: [],
        coveredExpenses: [],
        documentIds: [],
        sponsorshipLetter: false,
        proofOfRelationship: false,
      })
    }

    setDialogOpen(false)
    resetForm()
  }

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor)
    setFormData({
      firstName: sponsor.firstName,
      lastName: sponsor.lastName,
      relationship: sponsor.relationship,
      monthlyIncome: sponsor.monthlyIncome?.toString() ?? '',
      currency: sponsor.currency,
    })
    setDialogOpen(true)
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sponsors</h1>
          <p className="text-muted-foreground">
            People who will sponsor your trip financially
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Sponsor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSponsor ? 'Edit Sponsor' : 'Add Sponsor'}
              </DialogTitle>
              <DialogDescription>
                Enter the sponsor&apos;s information
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Relationship *</Label>
                <Select
                  value={formData.relationship}
                  onValueChange={(value) =>
                    setFormData({ ...formData, relationship: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="employer">Employer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Monthly Income</Label>
                  <Input
                    type="number"
                    value={formData.monthlyIncome}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyIncome: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingSponsor ? 'Save Changes' : 'Add Sponsor'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {state.sponsors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sponsors added yet</p>
            <p className="text-sm text-muted-foreground">
              Add sponsors if someone else will fund your trip
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {state.sponsors.map((sponsor) => (
            <Card key={sponsor.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {sponsor.firstName} {sponsor.lastName}
                  </CardTitle>
                  <CardDescription>
                    {sponsor.relationship.charAt(0).toUpperCase() +
                      sponsor.relationship.slice(1)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(sponsor)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeSponsor(sponsor.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sponsor.monthlyIncome && (
                  <p className="text-sm">
                    Monthly Income: {sponsor.monthlyIncome.toLocaleString()}{' '}
                    {sponsor.currency}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
