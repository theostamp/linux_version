"use client"

import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "./button"

interface CollapsibleProps {
  children: React.ReactNode
  defaultOpen?: boolean
}

interface CollapsibleTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  onClick?: () => void
}

interface CollapsibleContentProps {
  children: React.ReactNode
}

const CollapsibleContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
} | null>(null)

const Collapsible: React.FC<CollapsibleProps> = ({ children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  
  return (
    <CollapsibleContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </CollapsibleContext.Provider>
  )
}

const CollapsibleTrigger: React.FC<CollapsibleTriggerProps> = ({ children, asChild, onClick }) => {
  const context = React.useContext(CollapsibleContext)
  if (!context) throw new Error("CollapsibleTrigger must be used within Collapsible")
  
  const { isOpen, setIsOpen } = context
  
  const handleClick = () => {
    setIsOpen(!isOpen)
    onClick?.()
  }
  
  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick
    })
  }
  
  return (
    <Button variant="ghost" size="sm" onClick={handleClick}>
      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </Button>
  )
}

const CollapsibleContent: React.FC<CollapsibleContentProps> = ({ children }) => {
  const context = React.useContext(CollapsibleContext)
  if (!context) throw new Error("CollapsibleContent must be used within Collapsible")
  
  const { isOpen } = context
  
  if (!isOpen) return null
  
  return <div className="mt-2">{children}</div>
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
