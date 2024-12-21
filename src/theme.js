// theme.js
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark', 
    // สีพื้นหลังหลัก ๆ
    background: {
      default: '#0f0f0f', // พื้นหลังรวม (สีดำ/เทาเข้ม)
      paper:   '#1a1a1a'  // พื้นหลังของ Card/Paper (เทาเข้มขึ้นอีกระดับ)
    },
    // สีหลัก (Primary) เป็นน้ำเงินสว่าง (ดูคล้ายในภาพ)
    primary: {
      main: '#3B82F6' // หรือ #2979ff, #1d4ed8 แล้วแต่ชอบ
    },
    // สีเขียว (Success) สำหรับค่าที่เพิ่มขึ้น
    success: {
      main: '#22c55e' // tailwind: green-500-ish
    },
    // สีแดง (Error) สำหรับค่าที่ลดลง
    error: {
      main: '#ef4444' // tailwind: red-500-ish
    },
    // สามารถใช้ warning, info, secondary, etc. เพิ่มได้
    text: {
      primary: '#ffffff', // ข้อความสีขาว
      secondary: '#d1d5db' // ข้อความเทาอ่อน
    }
  },
  typography: {
    // ฟอนต์ ตามชอบ เช่น Roboto, Inter, Nunito...
    fontFamily: 'Roboto, sans-serif'
  },
  // สามารถปรับขนาดตัวอักษร, spacing, shape (โค้งขอบ) ฯลฯ ได้
})

export default theme
