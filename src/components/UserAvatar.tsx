import type { User } from "../types";

interface Props {
  user: Pick<User, "displayName" | "color" | "avatarMode" | "googlePhotoURL">;
  size?: "sm" | "md";
  className?: string;
}

export function UserAvatar({ user, size = "sm", className = "" }: Props) {
  const shouldUseGooglePhoto =
    user.avatarMode === "google" && Boolean(user.googlePhotoURL);
  const classNames = ["user-avatar", `user-avatar-${size}`, className]
    .filter(Boolean)
    .join(" ");

  if (shouldUseGooglePhoto) {
    return (
      <img
        className={classNames}
        src={user.googlePhotoURL || ""}
        alt={user.displayName}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className={classNames}
      aria-hidden="true"
      style={{ backgroundColor: user.color || "#888888" }}
    />
  );
}
