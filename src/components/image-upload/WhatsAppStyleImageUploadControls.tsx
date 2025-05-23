
import WhatsAppStyleImageInput from "../camera/WhatsAppStyleImageInput";

interface WhatsAppStyleImageUploadControlsProps {
  componentId: string;
  isProcessing: boolean;
  compressionInProgress: boolean;
  handleImageCapture: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCameraCapture: (imageData: string[]) => void;
  canAddMore: boolean;
  disabled: boolean;
  totalImages: number;
  maxImages: number;
}

const WhatsAppStyleImageUploadControls = ({
  componentId,
  isProcessing,
  compressionInProgress,
  handleImageCapture,
  handleCameraCapture,
  canAddMore,
  disabled,
  totalImages,
  maxImages
}: WhatsAppStyleImageUploadControlsProps) => {
  return (
    <div className="flex flex-col gap-2">
      <WhatsAppStyleImageInput
        id={`image-upload-${componentId}`}
        isProcessing={isProcessing || compressionInProgress}
        onChange={handleImageCapture}
        onImageCapture={handleCameraCapture}
        multiple={true}
        disabled={!canAddMore || disabled}
        totalImages={totalImages}
        maxImages={maxImages}
        compressionInProgress={compressionInProgress}
      />
      <div className="text-sm text-gray-500 mt-1">
        {totalImages}/{maxImages} images
      </div>
    </div>
  );
};

export default WhatsAppStyleImageUploadControls;
