import { onAuthStateChanged } from 'firebase/auth'
import { Unsubscribe, get, ref } from 'firebase/database'
import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { EMPTY_USER, LOADING_USER, User, UserRole } from '../util/User'
import { auth, database } from './Firebase'

export enum UserActionType {
  SIGN_IN = 'sign_in',
  UPDATE_USER = 'update_user',
  SIGN_OUT = 'sign_out'
}

export type UserAction =
  | { type: UserActionType.SIGN_IN; payload: User }
  | { type: UserActionType.UPDATE_USER; payload: User }
  | { type: UserActionType.SIGN_OUT }

interface UserContextType {
  user: User
  dispatch: React.Dispatch<UserAction>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

function userReducer(state: User, action: UserAction): User {
  switch (action.type) {
    case UserActionType.SIGN_IN: {
      const signedInUser = new User({ ...state })
      signedInUser.update(action.payload)
      return signedInUser
    }
    case UserActionType.UPDATE_USER: {
      const updatedUser = new User({ ...state })
      updatedUser.update(action.payload)
      return updatedUser
    }
    case UserActionType.SIGN_OUT: {
      return EMPTY_USER
    }
    default:
      return state
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, dispatch] = useReducer(userReducer, LOADING_USER)
  const userNameUnsubscriberRef = useRef<Unsubscribe>()

  useEffect(() => {
    if (!user?.uid) {
      dispatch({ type: UserActionType.UPDATE_USER, payload: new User({ loading: true }) })
    }
    onAuthStateChanged(auth, (authUser) => {
      if (!authUser?.uid) {
        dispatch({ type: UserActionType.SIGN_OUT })
        return
      }

      dispatch({
        type: UserActionType.UPDATE_USER,
        payload: new User({
          uid: authUser.uid,
          email: authUser.email ?? undefined,
          loading: true
        })
      })

      get(ref(database, `users/${authUser.uid}`))
        .then((snapshot) => {
          const { name, role } = snapshot.val()
          if (user.name !== name || user.role !== role) {
            dispatch({
              type: UserActionType.UPDATE_USER,
              payload: new User({
                name,
                role: role as UserRole,
                loading: false
              })
            })
          }
        })
        .catch((error) => {
          console.error(`could not get metadata for user ${authUser.uid}: ${error}`)
        })
    })
  }, [])

  return <UserContext.Provider value={{ user, dispatch }}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
