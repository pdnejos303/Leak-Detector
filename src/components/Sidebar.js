// src/components/Sidebar.js
import React, { useEffect, useState } from 'react'
import { db } from '../firebase'
import { ref, onValue } from 'firebase/database'
import { Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material'

function Sidebar() {
  const [leaks, setLeaks] = useState([])

  useEffect(() => {
    const leaksRef = ref(db, 'leaks')
    onValue(leaksRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const arr = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }))
        setLeaks(arr)
      } else {
        setLeaks([])
      }
    })
  }, [])

  return (
    <Box
      component={Paper}
      sx={{
        width: '20%',
        p: 2,
        borderRight: '1px solid #ccc',
        backgroundColor: 'background.paper'
      }}
    >
      <Typography variant="h6" gutterBottom>
        ไฟล์/ข้อมูลที่รั่ว
      </Typography>
      <List>
        {leaks.map((item) => (
          <ListItem key={item.id} sx={{ borderBottom: '1px solid #e0e0e0' }}>
            <ListItemText
              primary={`ชื่อไฟล์: ${item.fileName || 'N/A'}`}
              secondary={`ค่าเซนเซอร์/รายละเอียด: ${item.value || 'N/A'}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}

export default Sidebar
