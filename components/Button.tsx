import type { ComponentPropsWithoutRef } from "react";

type Variant = "default" | "primary" | "ghost";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
};

export default function Button({
  variant = "default",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  const classes = [
    variant === "primary" ? "primary" : "",
    variant === "ghost" ? "btn-ghost" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return <button type={type} className={classes || undefined} {...props} />;
}
