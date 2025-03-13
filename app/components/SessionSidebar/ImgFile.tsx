import { useEffect, useState } from 'react';

interface ImgFileProps {
  file: { file: () => Promise<File>; type: string };
  alt: string;
  className: string;
}

/**
 * Component to display an image file from a Fireproof file attachment
 * It handles loading the file and converting it to a data URL
 */
export function ImgFile({ file, alt, className }: ImgFileProps) {
  const [imgDataUrl, setImgDataUrl] = useState('');

  useEffect(() => {
    if (file.type && /image/.test(file.type)) {
      file.file().then((file: File) => {
        const src = URL.createObjectURL(file);
        setImgDataUrl(src);
        return () => URL.revokeObjectURL(src);
      });
    }
  }, [file]);

  return imgDataUrl ? (
    <img className={`${className} max-h-60 max-w-full object-contain`} alt={alt} src={imgDataUrl} />
  ) : null;
}
