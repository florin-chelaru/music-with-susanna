import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { auth, database } from './Firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Unsubscribe, onValue, ref } from 'firebase/database'
import { User, EMPTY_USER, UserRole, LOADING_USER } from '../util/User'

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
    onAuthStateChanged(auth, (user) => {
      if (!user?.uid) {
        dispatch({ type: UserActionType.SIGN_OUT })
        return
      }

      dispatch({
        type: UserActionType.UPDATE_USER,
        payload: new User({
          uid: user.uid,
          email: user.email ?? undefined,
          loading: false
        })
      })
    })
  }, [])

  useEffect(() => {
    if (user.loading) {
      return
    }
    if (userNameUnsubscriberRef.current) {
      userNameUnsubscriberRef.current()
    }
    if (!user.uid) {
      return
    }
    userNameUnsubscriberRef.current = onValue(
      ref(database, `users/${user.uid}`),
      (snapshot) => {
        const { name, role } = snapshot.val()
        if (user.name !== name || user.role !== role) {
          dispatch({
            type: UserActionType.UPDATE_USER,
            payload: new User({
              name,
              role: role as UserRole
            })
          })
        }
      },
      (error) => {
        console.error(error.message)
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
