// src/components/MainContent.js
import React, { useEffect, useState } from 'react'
import { db } from '../firebase'
import { ref, onValue } from 'firebase/database'
import { Box, Typography, Paper } from '@mui/material'

function MainContent() {
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    const chartRef = ref(db, 'chartData')
    onValue(chartRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setChartData(data)
      }
    })
  }, [])

  return (
    <Box
      component={Paper}
      sx={{
        flex: 1,
        p: 2,
        backgroundColor: 'background.paper',
        overflowY: 'auto'
      }}
    >
      <Typography variant="h6" gutterBottom>
        กราฟแสดงข้อมูล
      </Typography>
      {chartData.length > 0 ? (
        chartData.map((value, index) => (
          <Typography key={index} variant="body1">
            จุดที่ {index + 1}: {value}
          </Typography>
        ))
      ) : (
        <Typography variant="body1">ยังไม่มีข้อมูลกราฟ</Typography>
      )}
    </Box>
  )
}

export default MainContent
