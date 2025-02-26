import axios from "axios";
import { useRef} from "react";

interface DetailItemProps {
    label: string
    value: string
    type?: "text" | "image"
    className?: string
  }
  
  export default function DetailItem({ label, value, type = "text", className = "" }: DetailItemProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const handleUpdate = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          alert('File size should not exceed 5MB');
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        try {
           const upload = await axios.post('http://localhost:3000/api/v1/upload',formData,{
            headers: { 'Content-Type': 'multipart/form-data' }
           })
           if(upload.status !== 200){
            alert("Error in file uploading. Please try again!")
            return;
          }
        const fileUrl = upload.data.fileUrl;
        const update = await axios.put('http://localhost:3000/api/v1/updateUrl',{
          label,
          value : fileUrl
            },{withCredentials : true})
           if(update.status !==200){
            alert("Error in file uploading. Please try again!")
            return;
           }
           alert("File uploaded successfully!");
           window.location.reload();
        } catch (error) {
          alert("error to connect database")
        }

    };
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <h2 className="text-sm font-medium text-purple-700 mb-2">{label}</h2>
        {type === "text" && <p className="text-gray-800">{value}</p>}
        {type === "image" && (
          <div> 
            <img src={value || "/placeholder.svg"} alt={label} className="w-full h-48 object-contain rounded-lg" />
            <button className="bg-amber-300 rounded-2xl w-16 h-7 text-sm font-semibold sm:font-bold cursor-pointer" onClick={handleUpdate} >Update</button>
            <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpg, image/jpeg"
            onChange={handleFileChange}
          />
          </div>
          // 
        )}
      </div>
    )
  }
  
  