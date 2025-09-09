import React, { useState } from "react";
import Image from "next/image";

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  imageUrl?: string;
  size?: number; // px
}

const getInitials = (first: string, last: string) =>
  `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();

const getColor = (name: string) => {
  // Simple hash for consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 70%, 60%)`;
  return color;
};

const UserAvatar: React.FC<UserAvatarProps> = ({
  firstName,
  lastName,
  imageUrl,
  size = 40,
}) => {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(firstName, lastName);
  const bgColor = getColor(`${firstName} ${lastName}`);

  return imgError || !imageUrl ? (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bgColor,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: size * 0.45,
        userSelect: "none",
      }}
      aria-label={initials}
    >
      {initials}
    </div>
  ) : (
    <Image
      src={imageUrl}
      alt={`${firstName} ${lastName}`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      sizes={`${size}px`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        display: "block",
      }}
      onError={() => setImgError(true)}
    />
  );
};

export default UserAvatar;
