import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const TERMS_ACCEPTANCE_KEY = "pulse-guard.hasAcceptedTerms";

interface LegalAcceptanceContextType {
  hasAcceptedTerms: boolean;
  isLoading: boolean;
  setHasAcceptedTerms: (value: boolean) => Promise<void>;
}

const LegalAcceptanceContext = createContext<LegalAcceptanceContextType | undefined>(undefined);

export function useLegalAcceptance() {
  const context = useContext(LegalAcceptanceContext);

  if (context === undefined) {
    throw new Error("useLegalAcceptance must be used within a LegalAcceptanceProvider");
  }

  return context;
}

interface LegalAcceptanceProviderProps {
  children: ReactNode;
}

export function LegalAcceptanceProvider({ children }: LegalAcceptanceProviderProps) {
  const [hasAcceptedTerms, setHasAcceptedTermsState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TERMS_ACCEPTANCE_KEY)
      .then((storedValue) => {
        setHasAcceptedTermsState(storedValue === "true");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  async function setHasAcceptedTerms(value: boolean) {
    setHasAcceptedTermsState(value);
    await AsyncStorage.setItem(TERMS_ACCEPTANCE_KEY, String(value));
  }

  return (
    <LegalAcceptanceContext.Provider
      value={{ hasAcceptedTerms, isLoading, setHasAcceptedTerms }}>
      {children}
    </LegalAcceptanceContext.Provider>
  );
}
