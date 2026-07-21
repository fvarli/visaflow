import type { Dossier } from '../schemas/dossier.schema'
import type { ValidationFinding, ValidationRule } from './types'

/**
 * Rule 8: A sponsor marked as active must have financial documents
 */
export const sponsorHasDocuments: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const findings: ValidationFinding[] = []

  for (const sponsor of dossier.sponsors) {
    // Check if sponsor has any documents assigned
    if (sponsor.documentIds.length === 0) {
      // Check if sponsor has financial proof indicated
      const hasFinancialInfo =
        sponsor.monthlyIncome !== undefined ||
        sponsor.liquidAssets !== undefined ||
        sponsor.investments.length > 0

      if (hasFinancialInfo) {
        findings.push({
          id: `sponsor-no-docs-${sponsor.id}`,
          severity: 'warning',
          title: 'Sponsor has no documents linked',
          description: `Sponsor "${sponsor.firstName} ${sponsor.lastName}" has financial information but no supporting documents linked.`,
          relatedFields: [`sponsors.${sponsor.id}.documentIds`],
          suggestedAction:
            'Add supporting financial documents for this sponsor.',
        })
      }
    }
  }

  return findings
}

/**
 * Rule 15: If financing is sponsor-funded, at least one sponsor must exist
 */
export const sponsorFundingRequiresSponsor: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const financing = dossier.application.financing

  if (!financing) return []

  const isSponsored =
    financing.source === 'sponsor' || financing.source === 'mixed'

  if (isSponsored && dossier.sponsors.length === 0) {
    return [
      {
        id: 'sponsored-no-sponsor',
        severity: 'error',
        title: 'Sponsor required for sponsored funding',
        description:
          'Trip financing indicates sponsor funding, but no sponsors have been added.',
        relatedFields: ['financing.source', 'sponsors'],
        suggestedAction:
          'Add at least one sponsor with their financial information.',
      },
    ]
  }

  // Check if sponsor has enough financial info
  if (isSponsored && dossier.sponsors.length > 0) {
    const sponsorsWithFinance = dossier.sponsors.filter(
      (s) =>
        s.monthlyIncome !== undefined ||
        s.liquidAssets !== undefined ||
        s.investments.length > 0
    )

    if (sponsorsWithFinance.length === 0) {
      return [
        {
          id: 'sponsors-no-finance-info',
          severity: 'warning',
          title: 'Sponsors have no financial information',
          description:
            'Sponsors have been added but none have financial information entered.',
          relatedFields: ['sponsors'],
          suggestedAction:
            'Enter financial information for at least one sponsor.',
        },
      ]
    }
  }

  return []
}

/**
 * Check sponsor relationship documentation
 */
export const sponsorRelationshipProof: ValidationRule = (
  dossier: Dossier
): ValidationFinding[] => {
  const findings: ValidationFinding[] = []

  for (const sponsor of dossier.sponsors) {
    // Family sponsors typically need proof of relationship
    const familyRelations = [
      'spouse',
      'parent',
      'child',
      'sibling',
      'grandparent',
      'grandchild',
    ]

    if (
      familyRelations.includes(sponsor.relationship) &&
      !sponsor.proofOfRelationship
    ) {
      findings.push({
        id: `sponsor-no-relationship-proof-${sponsor.id}`,
        severity: 'info',
        title: 'Family sponsor may need relationship proof',
        description: `Sponsor "${sponsor.firstName} ${sponsor.lastName}" (${sponsor.relationship}) may require proof of family relationship.`,
        relatedFields: [`sponsors.${sponsor.id}.proofOfRelationship`],
        suggestedAction:
          'Consider adding documents proving the family relationship.',
      })
    }
  }

  return findings
}

// Export all sponsor rules
export const sponsorRules: ValidationRule[] = [
  sponsorHasDocuments,
  sponsorFundingRequiresSponsor,
  sponsorRelationshipProof,
]
