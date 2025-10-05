import React, { useRef, useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import './App.css';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 10;

function CamToPdfService() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [fileName, setFileName] = useState('Report-' + new Date().toISOString().slice(0, 10));
  const [cameraStatus, setCameraStatus] = useState('Loading...');

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment'
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraStatus('Ready');
        }
      } catch (err) {
        setCameraStatus('Error: 카메라 접근 권한이 필요합니다.');
      }
    };
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.8); 
    setCapturedImages((prev) => [...prev, imageData]);
  };
  
  const deleteImage = (indexToDelete) => {
    setCapturedImages(prev => prev.filter((_, index) => index !== indexToDelete));
  };

  const convertToPdf = useCallback(() => {
    if (capturedImages.length === 0) return;
    
    const doc = new jsPDF('p', 'mm', 'a4'); 

    const printableWidth = A4_WIDTH_MM - 2 * MARGIN_MM;
    const printableHeight = A4_HEIGHT_MM - 2 * MARGIN_MM;

    capturedImages.forEach((imgData, index) => {
      if (index > 0) {
        doc.addPage();
      }
      
      const img = new Image();
      img.src = imgData;
      
      const imgRatio = img.width / img.height; 
      
      let finalWidth = printableWidth;
      let finalHeight = finalWidth / imgRatio;
      
      if (finalHeight > printableHeight) {
        finalHeight = printableHeight;
        finalWidth = finalHeight * imgRatio;
      }

      const x = MARGIN_MM + (printableWidth - finalWidth) / 2;
      const y = MARGIN_MM + (printableHeight - finalHeight) / 2;
      
      doc.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
    });

    doc.save(`${fileName.trim() || 'document'}.pdf`);
  }, [capturedImages, fileName]);

  return (
    <div className="cam-to-pdf-container">
      <h1>📷 Cam to PDF 서비스</h1>

      <div className="camera-area">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="video-preview"
          style={{ display: cameraStatus === 'Ready' ? 'block' : 'none' }}
        />
        <div className="camera-status">{cameraStatus}</div>
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <button 
          onClick={captureImage} 
          disabled={cameraStatus !== 'Ready'}
          className="capture-button"
        >
          ✅ 이미지 찍기 ({capturedImages.length} 장)
        </button>
      </div>

      <hr/>

      <h2>📄 캡처 목록</h2>
      <div className="preview-grid">
        {capturedImages.map((img, index) => (
          <div key={index} className="image-item">
            <img src={img} alt={`Captured ${index + 1}`} />
            <span className="image-index">{index + 1}</span>
            <button onClick={() => deleteImage(index)} className="delete-button">X</button>
          </div>
        ))}
        {capturedImages.length === 0 && <p className="empty-message">이미지를 찍어주세요.</p>}
      </div>

      <hr/>
      
      <h2>💾 PDF 변환</h2>
      <div className="conversion-area">
        <input 
          type="text" 
          value={fileName} 
          onChange={(e) => setFileName(e.target.value)}
          placeholder="저장할 파일 이름을 입력하세요"
          className="filename-input"
        />
        <button 
          onClick={convertToPdf}
          disabled={capturedImages.length === 0}
          className="convert-button"
        >
          PDF로 변환 및 저장
        </button>
        {capturedImages.length > 0 && 
            <p className="note">변환 버튼을 누르면 {capturedImages.length}장의 이미지가 하나의 PDF로 저장됩니다.</p>}
      </div>
    </div>
  );
}

export default CamToPdfService;