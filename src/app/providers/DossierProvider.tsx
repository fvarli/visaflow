import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react'
import type { Applicant } from '@/domain/schemas/applicant.schema'
import type { Application } from '@/domain/schemas/application.schema'
import type { Document } from '@/domain/schemas/document.schema'
import type { Sponsor } from '@/domain/schemas/sponsor.schema'
import type { Dossier } from '@/domain/schemas/dossier.schema'
import type { Trip } from '@/domain/schemas/trip.schema'
import type { Employment } from '@/domain/schemas/employment.schema'
import type {
  Financing,
  Appointment,
} from '@/domain/schemas/application.schema'
import { createApplicantId, createApplicationId } from '@/domain/types/common'

/**
 * The four data slices, with `null` meaning "absent" rather than "unchanged".
 *
 * `LOAD_DOSSIER` merges — a missing key keeps what was there — which is right
 * for importing a partial file. Switching between saved dossiers is the opposite
 * operation: dossier B not having an applicant must not leave dossier A's
 * applicant on screen. `REPLACE_DOSSIER` is that operation.
 */
export interface DossierSlices {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
}

// State type
interface DossierState {
  applicant: Applicant | null
  application: Application | null
  documents: Document[]
  sponsors: Sponsor[]
  /**
   * Bumped whenever the whole document is swapped rather than edited.
   *
   * Forms read their initial values once, at mount, so replacing the dossier
   * underneath a mounted form would leave the old values on screen — switching
   * dossiers, or reloading one after a cross-tab conflict, would look like it
   * had done nothing. Used as a React `key` so those pages remount.
   */
  generation: number
}

// Action types
type DossierAction =
  | { type: 'LOAD_DOSSIER'; payload: Partial<Dossier> }
  | { type: 'REPLACE_DOSSIER'; payload: DossierSlices }
  | { type: 'UPDATE_APPLICANT'; payload: Partial<Applicant> }
  | { type: 'UPDATE_APPLICATION'; payload: Partial<Application> }
  | { type: 'UPDATE_TRIP'; payload: Partial<Trip> }
  | { type: 'UPDATE_EMPLOYMENT'; payload: Partial<Employment> }
  | { type: 'UPDATE_FINANCING'; payload: Partial<Financing> }
  | { type: 'UPDATE_APPOINTMENT'; payload: Partial<Appointment> }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | {
      type: 'UPDATE_DOCUMENT'
      payload: { id: string; updates: Partial<Document> }
    }
  | { type: 'REMOVE_DOCUMENT'; payload: string }
  | { type: 'SET_DOCUMENTS'; payload: Document[] }
  | { type: 'ADD_SPONSOR'; payload: Sponsor }
  | {
      type: 'UPDATE_SPONSOR'
      payload: { id: string; updates: Partial<Sponsor> }
    }
  | { type: 'REMOVE_SPONSOR'; payload: string }
  | { type: 'RESET' }

// Initial state
const initialState: DossierState = {
  applicant: null,
  application: null,
  documents: [],
  sponsors: [],
  generation: 0,
}

// Helper to create empty applicant
function createEmptyApplicant(): Applicant {
  return {
    id: createApplicantId(),
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    passport: {
      number: '',
      issueDate: '',
      expiryDate: '',
      issuingCountry: '',
      passportType: 'ordinary',
    },
    previousPassports: [],
    previousVisas: [],
    previousRefusals: [],
    travelHistory: [],
  }
}

// Helper to create empty application
function createEmptyApplication(applicantId: string): Application {
  return {
    applicationId: createApplicationId(),
    applicantId,
    destinationCountry: '',
    visaType: 'short_stay_tourism',
    status: 'draft',
    createdAt: new Date().toISOString(),
    sponsorIds: [],
    documentIds: [],
    notes: [],
  }
}

// Reducer
function dossierReducer(
  state: DossierState,
  action: DossierAction
): DossierState {
  switch (action.type) {
    case 'LOAD_DOSSIER': {
      const { applicant, application, documents, sponsors } = action.payload
      return {
        applicant: applicant ?? state.applicant,
        application: application ?? state.application,
        documents: documents ?? state.documents,
        sponsors: sponsors ?? state.sponsors,
        // Loading a file also swaps what a mounted form should be showing.
        generation: state.generation + 1,
      }
    }

    case 'REPLACE_DOSSIER': {
      // Wholesale, including nulls — see `DossierSlices`.
      return {
        ...action.payload,
        generation: state.generation + 1,
      }
    }

    case 'UPDATE_APPLICANT': {
      if (!state.applicant) {
        const newApplicant = { ...createEmptyApplicant(), ...action.payload }
        return { ...state, applicant: newApplicant }
      }
      return {
        ...state,
        applicant: { ...state.applicant, ...action.payload },
      }
    }

    case 'UPDATE_APPLICATION': {
      if (!state.application) {
        const applicantId = state.applicant?.id ?? createApplicantId()
        const newApp = {
          ...createEmptyApplication(applicantId),
          ...action.payload,
        }
        return { ...state, application: newApp }
      }
      return {
        ...state,
        application: { ...state.application, ...action.payload },
      }
    }

    case 'UPDATE_TRIP': {
      if (!state.application) return state
      return {
        ...state,
        application: {
          ...state.application,
          trip: state.application.trip
            ? { ...state.application.trip, ...action.payload }
            : (action.payload as Trip),
        },
      }
    }

    case 'UPDATE_EMPLOYMENT': {
      if (!state.application) return state
      return {
        ...state,
        application: {
          ...state.application,
          employment: state.application.employment
            ? { ...state.application.employment, ...action.payload }
            : (action.payload as Employment),
        },
      }
    }

    case 'UPDATE_FINANCING': {
      if (!state.application) return state
      return {
        ...state,
        application: {
          ...state.application,
          financing: state.application.financing
            ? { ...state.application.financing, ...action.payload }
            : (action.payload as Financing),
        },
      }
    }

    case 'UPDATE_APPOINTMENT': {
      if (!state.application) return state
      return {
        ...state,
        application: {
          ...state.application,
          appointment: state.application.appointment
            ? { ...state.application.appointment, ...action.payload }
            : (action.payload as Appointment),
        },
      }
    }

    case 'ADD_DOCUMENT':
      return {
        ...state,
        documents: [...state.documents, action.payload],
      }

    case 'UPDATE_DOCUMENT': {
      const { id, updates } = action.payload
      return {
        ...state,
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, ...updates } : doc
        ),
      }
    }

    case 'REMOVE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter((doc) => doc.id !== action.payload),
      }

    case 'SET_DOCUMENTS':
      return {
        ...state,
        documents: action.payload,
      }

    case 'ADD_SPONSOR':
      return {
        ...state,
        sponsors: [...state.sponsors, action.payload],
      }

    case 'UPDATE_SPONSOR': {
      const { id, updates } = action.payload
      return {
        ...state,
        sponsors: state.sponsors.map((sponsor) =>
          sponsor.id === id ? { ...sponsor, ...updates } : sponsor
        ),
      }
    }

    case 'REMOVE_SPONSOR':
      return {
        ...state,
        sponsors: state.sponsors.filter((s) => s.id !== action.payload),
      }

    case 'RESET':
      return { ...initialState, generation: state.generation + 1 }

    default:
      return state
  }
}

// Context type
interface DossierContextValue {
  state: DossierState
  // Loaders
  loadDossier: (dossier: Partial<Dossier>) => void
  /** Swap the whole dossier, clearing absent slices. Used when switching. */
  replaceDossier: (slices: DossierSlices) => void
  initializeEmpty: (destinationCountry: string) => void
  // Applicant
  updateApplicant: (updates: Partial<Applicant>) => void
  // Application
  updateApplication: (updates: Partial<Application>) => void
  updateTrip: (updates: Partial<Trip>) => void
  updateEmployment: (updates: Partial<Employment>) => void
  updateFinancing: (updates: Partial<Financing>) => void
  updateAppointment: (updates: Partial<Appointment>) => void
  // Documents
  addDocument: (document: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  removeDocument: (id: string) => void
  setDocuments: (documents: Document[]) => void
  // Sponsors
  addSponsor: (sponsor: Sponsor) => void
  updateSponsor: (id: string, updates: Partial<Sponsor>) => void
  removeSponsor: (id: string) => void
  // State management
  reset: () => void
  // Computed
  hasData: boolean
}

const DossierContext = createContext<DossierContextValue | null>(null)

// Provider component
export function DossierProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dossierReducer, initialState)

  const loadDossier = useCallback((dossier: Partial<Dossier>) => {
    dispatch({ type: 'LOAD_DOSSIER', payload: dossier })
  }, [])

  const replaceDossier = useCallback((slices: DossierSlices) => {
    dispatch({ type: 'REPLACE_DOSSIER', payload: slices })
  }, [])

  const initializeEmpty = useCallback((destinationCountry: string) => {
    const applicant = createEmptyApplicant()
    const application = createEmptyApplication(applicant.id)
    application.destinationCountry = destinationCountry
    dispatch({
      type: 'LOAD_DOSSIER',
      payload: { applicant, application, documents: [], sponsors: [] },
    })
  }, [])

  const updateApplicant = useCallback((updates: Partial<Applicant>) => {
    dispatch({ type: 'UPDATE_APPLICANT', payload: updates })
  }, [])

  const updateApplication = useCallback((updates: Partial<Application>) => {
    dispatch({ type: 'UPDATE_APPLICATION', payload: updates })
  }, [])

  const updateTrip = useCallback((updates: Partial<Trip>) => {
    dispatch({ type: 'UPDATE_TRIP', payload: updates })
  }, [])

  const updateEmployment = useCallback((updates: Partial<Employment>) => {
    dispatch({ type: 'UPDATE_EMPLOYMENT', payload: updates })
  }, [])

  const updateFinancing = useCallback((updates: Partial<Financing>) => {
    dispatch({ type: 'UPDATE_FINANCING', payload: updates })
  }, [])

  const updateAppointment = useCallback((updates: Partial<Appointment>) => {
    dispatch({ type: 'UPDATE_APPOINTMENT', payload: updates })
  }, [])

  const addDocument = useCallback((document: Document) => {
    dispatch({ type: 'ADD_DOCUMENT', payload: document })
  }, [])

  const updateDocument = useCallback(
    (id: string, updates: Partial<Document>) => {
      dispatch({ type: 'UPDATE_DOCUMENT', payload: { id, updates } })
    },
    []
  )

  const removeDocument = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_DOCUMENT', payload: id })
  }, [])

  const setDocuments = useCallback((documents: Document[]) => {
    dispatch({ type: 'SET_DOCUMENTS', payload: documents })
  }, [])

  const addSponsor = useCallback((sponsor: Sponsor) => {
    dispatch({ type: 'ADD_SPONSOR', payload: sponsor })
  }, [])

  const updateSponsor = useCallback((id: string, updates: Partial<Sponsor>) => {
    dispatch({ type: 'UPDATE_SPONSOR', payload: { id, updates } })
  }, [])

  const removeSponsor = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_SPONSOR', payload: id })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const hasData = state.applicant !== null || state.application !== null

  const value: DossierContextValue = {
    state,
    loadDossier,
    replaceDossier,
    initializeEmpty,
    updateApplicant,
    updateApplication,
    updateTrip,
    updateEmployment,
    updateFinancing,
    updateAppointment,
    addDocument,
    updateDocument,
    removeDocument,
    setDocuments,
    addSponsor,
    updateSponsor,
    removeSponsor,
    reset,
    hasData,
  }

  return (
    <DossierContext.Provider value={value}>{children}</DossierContext.Provider>
  )
}

// Hook to use the context
export function useDossier(): DossierContextValue {
  const context = useContext(DossierContext)
  if (!context) {
    throw new Error('useDossier must be used within a DossierProvider')
  }
  return context
}
