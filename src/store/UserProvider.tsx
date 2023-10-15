import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { auth, database } from './Firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Unsubscribe, onValue, ref } from 'firebase/database'

export interface User {
  uid?: string | null
  email?: string | null
  password?: string | null
  firstName?: string | null
  lastName?: string | null
  loading?: boolean | null
}

const NO_USER: User = {}
const LOADING_USER: User = { loading: true }

export enum UserActionType {
  SIGN_IN,
  UPDATE_USER,
  SIGN_OUT
}

export type UserAction =
  | { type: UserActionType.SIGN_IN; payload: Partial<User> }
  | { type: UserActionType.UPDATE_USER; payload: Partial<User> }
  | { type: UserActionType.SIGN_OUT }

interface UserContextType {
  user: User
  dispatch: React.Dispatch<UserAction>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

function userReducer(state: User, action: UserAction): User {
  switch (action.type) {
    case UserActionType.SIGN_IN:
      return { ...state, ...action.payload }
    case UserActionType.UPDATE_USER:
      return { ...state, ...action.payload }
    case UserActionType.SIGN_OUT:
      return NO_USER
    default:
      return state
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, dispatch] = useReducer(userReducer, NO_USER)
  const userNameUnsubscriberRef = useRef<Unsubscribe>()

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        dispatch({ type: UserActionType.SIGN_OUT })
        return
      }

      dispatch({
        type: UserActionType.UPDATE_USER,
        payload: {
          uid: user.uid,
          email: user.email,
          loading: false
        }
      })
    })
  }, [])

  useEffect(() => {
    if (userNameUnsubscriberRef.current) {
      const unsubscribe = userNameUnsubscriberRef.current
      unsubscribe()
    }
    if (!user.uid) {
      return
    }
    userNameUnsubscriberRef.current = onValue(
      ref(database, `users/${user.uid}/name`),
      (snapshot) => {
        const name = snapshot.val() as string
        const names = name ? name.split(' ') : []
        dispatch({
          type: UserActionType.UPDATE_USER,
          payload: {
            firstName: names.length ? names[0] : user?.email,
            lastName: names.length >= 2 ? names[1] : undefined
          }
        })
      },
      (error) => {
        console.error(error.message)
        dispatch({
          type: UserActionType.UPDATE_USER,
          payload: {
            firstName: user?.email
          }
        })
      }
    )
  }, [user])

  return <UserContext.Provider value={{ user, dispatch }}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
