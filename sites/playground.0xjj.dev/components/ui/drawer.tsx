"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

type DrawerDirection = "bottom" | "right"

const DrawerContext = React.createContext<{
  direction: DrawerDirection
  showOverlay: boolean
}>({
  direction: "bottom",
  showOverlay: false,
})

function Drawer({
  direction = "bottom",
  showOverlay = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root> & {
  direction?: DrawerDirection
  showOverlay?: boolean
}) {
  return (
    <DrawerContext.Provider value={{ direction, showOverlay }}>
      <DrawerPrimitive.Root data-slot="drawer" direction={direction} {...props} />
    </DrawerContext.Provider>
  )
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]",
        className,
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  direction,
  showOverlay,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  direction?: DrawerDirection
  showOverlay?: boolean
}) {
  const drawerContext = React.useContext(DrawerContext)
  const resolvedDirection = direction ?? drawerContext.direction
  const resolvedOverlay = showOverlay ?? drawerContext.showOverlay

  return (
    <DrawerPortal>
      {resolvedOverlay && <DrawerOverlay />}
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          resolvedDirection === "bottom"
            ? "fixed inset-x-0 bottom-0 z-50 mx-auto mt-24 max-w-screen-lg rounded-t-[28px] border border-b-0 bg-background pb-[env(safe-area-inset-bottom)] shadow-lg outline-none"
            : "fixed top-0 right-0 bottom-0 z-50 w-[min(420px,100vw)] rounded-l-[28px] border border-r-0 bg-background pr-[env(safe-area-inset-right)] shadow-lg outline-none",
          className,
        )}
        {...props}
      >
        {resolvedDirection === "bottom" && (
          <DrawerPrimitive.Handle className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-black/12 dark:bg-white/14" />
        )}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("px-5 pt-4 pb-3 text-left", className)}
      {...props}
    />
  )
}

function DrawerFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("border-t bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80", className)}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-base font-semibold", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("mt-1 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
}
