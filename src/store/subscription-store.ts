// store/subscription-store.ts — Zustand store for subscription state
import { create } from 'zustand';

export interface SubscriptionInfo {
  id: string;
  planId: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'pending';
  period: 'monthly' | 'term' | 'annual';
  subjects: string[];
  allSubjects: boolean;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  basePrice: number;
  finalPrice: number;
  discountPercent: number;
}

export interface PlanInfo {
  id: string;
  name: string;
  maxSubjects: number;
  pricePerSubject: number;
  features: string[];
  isPopular: boolean;
}

interface SubscriptionState {
  subscription: SubscriptionInfo | null;
  plans: PlanInfo[];
  availableSubjects: { id: string; name: string; icon: string }[];
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionActions {
  setSubscription: (subscription: SubscriptionInfo | null) => void;
  setPlans: (plans: PlanInfo[]) => void;
  setAvailableSubjects: (
    subjects: { id: string; name: string; icon: string }[]
  ) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  hasAccess: (subjectId: string) => boolean;
  isActive: () => boolean;
  reset: () => void;
}

const initialState: SubscriptionState = {
  subscription: null,
  plans: [],
  availableSubjects: [],
  isLoading: false,
  error: null,
};

export const useSubscriptionStore = create<
  SubscriptionState & SubscriptionActions
>()((set, get) => ({
  ...initialState,

  setSubscription: (subscription) => set({ subscription }),

  setPlans: (plans) => set({ plans }),

  setAvailableSubjects: (availableSubjects) => set({ availableSubjects }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  hasAccess: (subjectId) => {
    const { subscription } = get();
    if (!subscription) return false;

    const isActiveOrTrial =
      subscription.status === 'active' || subscription.status === 'trial';
    if (!isActiveOrTrial) return false;

    if (subscription.allSubjects) return true;

    return subscription.subjects.includes(subjectId);
  },

  isActive: () => {
    const { subscription } = get();
    if (!subscription) return false;
    return (
      subscription.status === 'active' || subscription.status === 'trial'
    );
  },

  reset: () => set(initialState),
}));
