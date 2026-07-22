import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Plus, Trash2, User } from 'lucide-react'
import { NoDossierState } from '@/components/NoDossierState'
import { dynamicT } from '@/lib/i18n-dynamic'
import { useFormatters } from '@/lib/format'
import { createSponsorId } from '@/domain/types/common'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'

export default function SponsorsPage() {
  const { state, addSponsor, updateSponsor, removeSponsor, hasData } =
    useDossier()
  const { t } = useTranslation(['sponsors', 'common', 'visa-domain'])
  const td = dynamicT(t)
  const format = useFormatters()
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
    return <NoDossierState section={t('sponsors:title')} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('sponsors:title')}</h1>
          <p className="text-muted-foreground">{t('sponsors:description')}</p>
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
              {t('sponsors:add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSponsor ? t('sponsors:edit') : t('sponsors:add')}
              </DialogTitle>
              <DialogDescription>
                {t('sponsors:dialogDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('sponsors:fields.firstName')} *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder={t('sponsors:fields.firstName')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('sponsors:fields.lastName')} *</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder={t('sponsors:fields.lastName')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('sponsors:fields.relationship')} *</Label>
                <Select
                  value={formData.relationship}
                  onValueChange={(value) =>
                    setFormData({ ...formData, relationship: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('sponsors:fields.relationshipPlaceholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">
                      {td('visa-domain:sponsorRelationship.spouse')}
                    </SelectItem>
                    <SelectItem value="parent">
                      {td('visa-domain:sponsorRelationship.parent')}
                    </SelectItem>
                    <SelectItem value="child">
                      {td('visa-domain:sponsorRelationship.child')}
                    </SelectItem>
                    <SelectItem value="sibling">
                      {td('visa-domain:sponsorRelationship.sibling')}
                    </SelectItem>
                    <SelectItem value="grandparent">
                      {td('visa-domain:sponsorRelationship.grandparent')}
                    </SelectItem>
                    <SelectItem value="friend">
                      {td('visa-domain:sponsorRelationship.friend')}
                    </SelectItem>
                    <SelectItem value="employer">
                      {td('visa-domain:sponsorRelationship.employer')}
                    </SelectItem>
                    <SelectItem value="other">
                      {td('visa-domain:sponsorRelationship.other')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('sponsors:fields.monthlyIncome')}</Label>
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
                  <Label>{t('sponsors:fields.currency')}</Label>
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
                  {t('common:actions.cancel')}
                </Button>
                <Button onClick={handleSubmit}>
                  {editingSponsor
                    ? t('common:actions.saveChanges')
                    : t('sponsors:add')}
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
            <p className="text-muted-foreground">{t('sponsors:empty.title')}</p>
            <p className="text-sm text-muted-foreground">
              {t('sponsors:empty.description')}
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
                    {td(
                      `visa-domain:sponsorRelationship.${sponsor.relationship}`
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(sponsor)}
                  >
                    {t('common:actions.edit')}
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
                  <p className="text-sm" data-numeric>
                    {t('sponsors:card.monthlyIncome')}:{' '}
                    {format.currency(sponsor.monthlyIncome, sponsor.currency)}
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
