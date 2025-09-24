import React, { createContext, useContext } from 'react'
import { Firestore } from 'firebase/firestore'

interface FirebaseContextType {
  db: Firestore
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined)

export const useFirebase = () => {
  const context = useContext(FirebaseContext)
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider')
  }
  return context
}

interface FirebaseProviderProps {
  children: React.ReactNode
  db: Firestore
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children, db }) => {
  const value = {
    db
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  )
}