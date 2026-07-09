/* eslint-disable @next/next/no-img-element */
import React from "react";

type PlainImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  alt: string;
};

export function PlainImage({
  alt,
  loading = "lazy",
  decoding = "async",
  ...props
}: PlainImageProps) {
  return <img alt={alt} loading={loading} decoding={decoding} {...props} />;
}
