import { createContext } from 'react'
import FabChat from '../Components/FabChat'
import FabCreate from '../Components/FabCreate'
import ScrollTop from '../Components/ScrollTop'
import { User, UserRole } from '../util/User'

export class FabPosition {
  private static readonly pathsWithoutChat = ['/students']
  get(fabName: string, user?: User): Object {
    const hideChat =
      user?.role === UserRole.TEACHER ||
      FabPosition.pathsWithoutChat.find((path) => location.pathname.startsWith(path))
    switch (fabName) {
      case FabChat.name:
        return hideChat ? { display: 'none' } : { bottom: 32, right: 32 }
      case FabCreate.name:
        return { bottom: 32, right: 32 }
      case ScrollTop.name:
        return hideChat ? { bottom: 32, right: 32 } : { bottom: 104, right: 40 }
    }
    return {
      bottom: 32,
      right: 32
    }
  }
}

export const FabPositionContext = createContext<FabPosition>(new FabPosition())

export interface FabPositionProviderProps {
  children: JSX.Element | JSX.Element[]
}

export default function FabPositionProvider({ children }: FabPositionProviderProps) {
  return (
    <FabPositionContext.Provider value={new FabPosition()}>{children}</FabPositionContext.Provider>
  )
}
