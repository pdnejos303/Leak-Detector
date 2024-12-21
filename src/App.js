// App.js
// -- Import Firebase --
import { rtdb, fsdb } from './firebase'  // ต้อง export rtdb, fsdb ใน firebase.js
import { ref, onValue } from 'firebase/database'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore'

// ------------------ (1) Import ทั้งหมดอยู่ด้านบน ------------------
import React from 'react'
import {
  AppBar, Toolbar, Typography, Avatar, Box,
  Card, CardContent, Chip, IconButton, Button, TextField
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

// ถ้ามีโลโก้ใน src/logo.png
import Logo from './logo.png'

// Chart.js & react-chartjs-2
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)


// ------------------ Styled AppBar ------------------
const HeaderBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper
}))

function App() {
  // ------------------ A) Theme ------------------
  const [isDark, setIsDark] = React.useState(true)
  const toggleTheme = () => setIsDark(!isDark)

  const theme = React.useMemo(() => {
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        ...(isDark
          ? {
              background: { default: '#0f0f0f', paper: '#1a1a1a' },
              primary: { main: '#3B82F6' },
              success: { main: '#22c55e' },
              error: { main: '#ef4444' },
              text: { primary: '#ffffff' }
            }
          : {
              background: { default: '#F0F0F0', paper: '#ffffff' },
              primary: { main: '#1976d2' },
              success: { main: '#2e7d32' },
              error: { main: '#d32f2f' },
              text: { primary: '#333333' }
            })
      }
    })
  }, [isDark])

  // ------------------ B) Realtime DB State ------------------
  const [deviceStatus, setDeviceStatus] = React.useState('ออนไลน์')
  const [dateString, setDateString] = React.useState('')
  const [timeString, setTimeString] = React.useState('')
  const [voltageArr, setVoltageArr] = React.useState([])
  const [leakageArr, setLeakageArr] = React.useState([])

  // หากไม่มีการอัปเดตเกิน 90s => offline
  const [lastUpdateSec, setLastUpdateSec] = React.useState(0)
  const intervalRef = React.useRef(null)

  // เก็บค่า leakageCurrent ก่อนหน้า
  const prevLeakRef = React.useRef(0)
  // กันซ้ำ 2 อัน
  const hasJustAddedRef = React.useRef(false)

  // ------------------ C) Firestore: Leak History ------------------
  const [leakHistory, setLeakHistory] = React.useState([])
  const [editLocation, setEditLocation] = React.useState('')
  const [showEditLocation, setShowEditLocation] = React.useState(false)

  // ชื่ออุปกรณ์
  const [deviceName] = React.useState('Smart_Monitor_001')

  // ------------------ D) ดึงข้อมูลจาก Realtime DB ------------------
  React.useEffect(() => {
    const dataRef = ref(rtdb, 'Devices/Smart_Monitor_001/Data')
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        // เก็บ Date/Time
        setDateString(data.Date || '')
        setTimeString(data.Time || '')

        // เก็บค่า Voltage/Leakage ลง array 10 จุด
        setVoltageArr((prev) => {
          const newArr = [...prev, data.Voltage || 0]
          if (newArr.length > 10) newArr.shift()
          return newArr
        })
        setLeakageArr((prev) => {
          const newArr = [...prev, data.leakageCurrent || 0]
          if (newArr.length > 10) newArr.shift()
          return newArr
        })

        // reset lastUpdate
        setLastUpdateSec(0)

        // ตรวจ 0->1
        if (prevLeakRef.current === 0 && data.leakageCurrent === 1) {
          if (!hasJustAddedRef.current) {
            // add to Firestore (ถ้าไม่เคย add)
            addLeakHistory(data)
            hasJustAddedRef.current = true
          }
        } else if (prevLeakRef.current === 1 && data.leakageCurrent === 0) {
          // กลับมา 0 => พร้อม add ใหม่คราวหน้า
          hasJustAddedRef.current = false
        }
        prevLeakRef.current = data.leakageCurrent
      }
    })
    return () => unsubscribe()
  }, [])

  // ------------------ E) CRUD Firestore ------------------
  const loadLeakHistory = async () => {
    try {
      const snap = await getDocs(collection(fsdb, 'LeakHistory'))
      const docs = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      setLeakHistory(docs)
    } catch (err) {
      console.error('Error loadLeakHistory:', err)
    }
  }

  // **ฟังก์ชันสำคัญ: เช็คและลบเอกสารซ้ำก่อน addDoc**
  const addLeakHistory = async (data) => {
    try {
      // 1) query doc ที่ date == data.Date && time == data.Time
      const colRef = collection(fsdb, 'LeakHistory')
      const qDup = query(colRef,
        where('date', '==', data.Date || ''),
        where('time', '==', data.Time || '')
      )
      const snapDup = await getDocs(qDup)

      // ถ้ามี doc เดิม => ลบออกก่อน (เพื่อไม่ให้ซ้ำ)
      if (!snapDup.empty) {
        snapDup.forEach(async (docSnap) => {
          await deleteDoc(doc(fsdb, 'LeakHistory', docSnap.id))
        })
      }

      // 2) เพิ่ม doc ใหม่
      await addDoc(collection(fsdb, 'LeakHistory'), {
        deviceName: deviceName,
        date: data.Date || '',
        time: data.Time || '',
        location: 'ไม่ทราบ',
        measure: 'ไฟรั่ว(1)',
        createdAt: serverTimestamp()
      })

      // reload
      loadLeakHistory()
    } catch (err) {
      console.error('Error addLeakHistory:', err)
    }
  }

  const handleDeleteCard = async (docId) => {
    try {
      await deleteDoc(doc(fsdb, 'LeakHistory', docId))
      loadLeakHistory()
    } catch (err) {
      console.error('Error delete:', err)
    }
  }

  const handleUpdateLocation = async (docId) => {
    try {
      await updateDoc(doc(fsdb, 'LeakHistory', docId), {
        location: editLocation
      })
      setShowEditLocation(false)
      setEditLocation('')
      loadLeakHistory()
    } catch (err) {
      console.error('Error update location:', err)
    }
  }

  // ------------------ F) lastUpdateSec++ ทุก 1 วินาที ------------------
  React.useEffect(() => {
    intervalRef.current = setInterval(() => {
      setLastUpdateSec((prev) => prev + 1)
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // ถ้า >=90 => ออฟไลน์
  React.useEffect(() => {
    if (lastUpdateSec >= 90) {
      setDeviceStatus('ออฟไลน์')
    } else {
      setDeviceStatus('ออนไลน์')
    }
  }, [lastUpdateSec])

  // ------------------ G) load ประวัติตอนแรก ------------------
  React.useEffect(() => {
    loadLeakHistory()
  }, [])

  // ------------------ H) data กราฟ ------------------
  const voltageChartData = {
    labels: voltageArr.map((_, i) => i + 1),
    datasets: [
      {
        label: 'Voltage (V)',
        data: voltageArr,
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.main,
        tension: 0.2
      }
    ]
  }
  const leakageChartData = {
    labels: leakageArr.map((_, i) => i + 1),
    datasets: [
      {
        label: 'leakageCurrent (0=ไม่รั่ว,1=รั่ว)',
        data: leakageArr,
        borderColor: theme.palette.error.main,
        backgroundColor: theme.palette.error.main,
        tension: 0.2
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    scales: {
      x: { ticks: { color: theme.palette.text.primary } },
      y: {
        ticks: {
          color: theme.palette.text.primary,
          stepSize: 1,
          min: 0,
          max: 1
        }
      }
    },
    plugins: {
      legend: {
        labels: { color: theme.palette.text.primary }
      }
    }
  }

  // ------------------ I) render ------------------
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
        
        {/* -------- Header -------- */}
        <HeaderBar position="static">
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            {/* ซ้าย: โลโก้ + ชื่อระบบ */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 40, height: 40, mr: 1 }}>
                <img
                  src={Logo}
                  alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>
                ระบบตรวจสอบไฟฟ้ารั่ว
              </Typography>
            </Box>
            {/* ขวา: Avatar + ToggleTheme */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'gray', width: 40, height: 40, mr: 1 }}>
                {isDark ? 'DK' : 'LT'}
              </Avatar>
              <Typography variant="body1" sx={{ color: theme.palette.text.primary, mr: 2 }}>
                นาย ชื่อ นามสกุล
              </Typography>
              <IconButton onClick={toggleTheme}>
                {isDark
                  ? <LightModeIcon sx={{ color: theme.palette.text.primary }} />
                  : <DarkModeIcon sx={{ color: '#333' }} />
                }
              </IconButton>
            </Box>
          </Toolbar>
        </HeaderBar>

        {/* Layout 2 cols */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            height: { md: 'calc(100vh - 64px)' },
            p: 2,
            gap: 2
          }}
        >
          {/* ฝั่งซ้าย: วันเวลา + ประวัติไฟรั่ว */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              mb: { xs: 2, md: 0 }
            }}
          >
            {/* วันเวลา */}
            <Box sx={{ p: 2 }}>
              <Typography variant="body1" sx={{ mb: 1, color: theme.palette.text.primary }}>
                <strong>วันที่:</strong> {dateString}
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.text.primary }}>
                <strong>เวลาตอนนี้:</strong> {timeString} น.
              </Typography>
            </Box>
            {/* Card ประวัติไฟรั่ว */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pt: 0 }}>
              {leakHistory.map((item) => (
                <Card
                  key={item.id}
                  sx={{
                    mb: 2,
                    bgcolor: 'background.default',
                    boxShadow: 3,
                    borderRadius: 2
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 'bold', mb: 1, color: theme.palette.text.primary }}
                    >
                      ตรวจพบไฟฟ้ารั่ว
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                      ชื่ออุปกรณ์: {item.deviceName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                      ตำแหน่งที่ติดตั้ง: {item.location}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                      ค่าวัดได้: 1 (ไฟรั่ว)
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                      วันที่: {item.date}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                      เวลา: {item.time}
                    </Typography>

                    {/* Delete + Edit */}
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        sx={{ color: theme.palette.error.main }}
                        onClick={() => handleDeleteCard(item.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{ color: theme.palette.text.primary }}
                        onClick={() => {
                          setEditLocation(item.location || '')
                          setShowEditLocation(item.id)
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>

                    {/* ฟอร์มแก้ที่อยู่ */}
                    {showEditLocation === item.id && (
                      <Box sx={{ mt: 2 }}>
                        <TextField
                          size="small"
                          label="แก้ที่อยู่"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          sx={{ mr: 1 }}
                        />
                        <Button variant="contained" onClick={() => handleUpdateLocation(item.id)}>
                          บันทึก
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>

          {/* ฝั่งขวา: สถานะ + กราฟ */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            {/* บน: สถานะ ออนไลน์/ออฟไลน์ */}
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>
                  {deviceName}
                </Typography>
                <Chip
                  label={`สถานะ: ${deviceStatus}`}
                  sx={{
                    bgcolor: deviceStatus === 'ออนไลน์'
                      ? theme.palette.success.main
                      : theme.palette.error.main,
                    color: '#fff',
                    fontWeight: 'bold'
                  }}
                />
              </Box>
              <Typography variant="body1" sx={{ mt: 1, color: theme.palette.text.primary }}>
                สถานะ และระบบตรวจจับ
              </Typography>
            </Box>

            {/* ล่าง: กราฟ (Voltage, leakage) */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pt: 0 }}>
              {/* Voltage */}
              <Card sx={{ mb: 2, bgcolor: 'background.default', boxShadow: 3, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, color: theme.palette.text.primary }}>
                    แรงดันไฟฟ้า
                  </Typography>
                  <Box sx={{ width: '100%', height: 250 }}>
                    <Line
                      data={{
                        labels: voltageArr.map((_, i) => i + 1),
                        datasets: [
                          {
                            label: 'Voltage (V)',
                            data: voltageArr,
                            borderColor: theme.palette.primary.main,
                            backgroundColor: theme.palette.primary.main,
                            tension: 0.2
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        scales: {
                          x: { ticks: { color: theme.palette.text.primary } },
                          y: { ticks: { color: theme.palette.text.primary } }
                        },
                        plugins: {
                          legend: {
                            labels: { color: theme.palette.text.primary }
                          }
                        }
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* leakage */}
              <Card sx={{ bgcolor: 'background.default', boxShadow: 3, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, color: theme.palette.text.primary }}>
                    กระแสไฟฟ้า (0=ไม่รั่ว,1=รั่ว)
                  </Typography>
                  <Box sx={{ width: '100%', height: 250 }}>
                    <Line
                      data={{
                        labels: leakageArr.map((_, i) => i + 1),
                        datasets: [
                          {
                            label: 'leakageCurrent',
                            data: leakageArr,
                            borderColor: theme.palette.error.main,
                            backgroundColor: theme.palette.error.main,
                            tension: 0.2
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        scales: {
                          x: { ticks: { color: theme.palette.text.primary } },
                          y: {
                            ticks: {
                              color: theme.palette.text.primary,
                              stepSize: 1,
                              min: 0,
                              max: 1
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            labels: { color: theme.palette.text.primary }
                          }
                        }
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App
