import React from "react";
import { styles } from "../../styles";

export default function SuspectImage({ src, alt, style, onImageClick }) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      style={{ ...styles.img, ...(style || {}) }}
      onClick={() => onImageClick?.({ src, alt })}
    />
  );
}
