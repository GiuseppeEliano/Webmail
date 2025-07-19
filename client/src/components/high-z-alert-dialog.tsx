import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const HighZAlertDialog = AlertDialogPrimitive.Root

const HighZAlertDialogTrigger = AlertDialogPrimitive.Trigger

const HighZAlertDialogPortal = AlertDialogPrimitive.Portal

const HighZAlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 !z-[999999999] bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
HighZAlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const HighZAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <HighZAlertDialogPortal>
    <HighZAlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] !z-[999999999] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-gray-300 dark:border-gray-600 bg-background p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    />
  </HighZAlertDialogPortal>
))
HighZAlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const HighZAlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
HighZAlertDialogHeader.displayName = "HighZAlertDialogHeader"

const HighZAlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
HighZAlertDialogFooter.displayName = "HighZAlertDialogFooter"

const HighZAlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
HighZAlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const HighZAlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
HighZAlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const HighZAlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
HighZAlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const HighZAlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
HighZAlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  HighZAlertDialog,
  HighZAlertDialogPortal,
  HighZAlertDialogOverlay,
  HighZAlertDialogTrigger,
  HighZAlertDialogContent,
  HighZAlertDialogHeader,
  HighZAlertDialogFooter,
  HighZAlertDialogTitle,
  HighZAlertDialogDescription,
  HighZAlertDialogAction,
  HighZAlertDialogCancel,
}