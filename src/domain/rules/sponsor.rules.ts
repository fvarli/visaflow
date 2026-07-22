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
          ruleId: 'sponsor.hasDocuments',
          severity: 'warning',
          messageKey: 'findings.sponsorNoDocuments',
          messageParams: {
            values: {
              sponsorName: `${sponsor.firstName} ${sponsor.lastName}`,
            },
          },
          relatedFields: [`sponsors.${sponsor.id}.documentIds`],
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
        ruleId: 'sponsor.requiredForSponsoredFunding',
        severity: 'error',
        messageKey: 'findings.sponsoredNoSponsor',
        relatedFields: ['financing.source', 'sponsors'],
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
          ruleId: 'sponsor.requiredForSponsoredFunding',
          severity: 'warning',
          messageKey: 'findings.sponsorsNoFinanceInfo',
          relatedFields: ['sponsors'],
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
        ruleId: 'sponsor.relationshipProof',
        severity: 'info',
        messageKey: 'findings.sponsorRelationshipProof',
        messageParams: {
          values: {
            sponsorName: `${sponsor.firstName} ${sponsor.lastName}`,
          },
          enumKeys: {
            relationship: `visa-domain:sponsorRelationship.${sponsor.relationship}`,
          },
        },
        relatedFields: [`sponsors.${sponsor.id}.proofOfRelationship`],
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
