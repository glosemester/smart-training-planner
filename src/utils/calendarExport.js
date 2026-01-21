import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * Export calendar as PNG image
 */
export async function exportCalendarAsPNG(elementId) {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Calendar element not found')
    }

    // Generate canvas from element
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f0f0f',
      scale: 2, // Higher quality
      logging: false,
      useCORS: true
    })

    // Convert to blob and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fileName = `runcoach-kalender-${new Date().toISOString().split('T')[0]}.png`

      link.href = url
      link.download = fileName
      link.click()

      // Cleanup
      URL.revokeObjectURL(url)
    })

    return true
  } catch (error) {
    console.error('Failed to export as PNG:', error)
    throw error
  }
}

/**
 * Export calendar as PDF
 */
export async function exportCalendarAsPDF(elementId) {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Calendar element not found')
    }

    // Generate canvas from element
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f0f0f',
      scale: 2,
      logging: false,
      useCORS: true
    })

    const imgData = canvas.toDataURL('image/png')

    // Calculate PDF dimensions
    const imgWidth = 210 // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Create PDF
    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

    // Save PDF
    const fileName = `runcoach-kalender-${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(fileName)

    return true
  } catch (error) {
    console.error('Failed to export as PDF:', error)
    throw error
  }
}

/**
 * Share calendar as image using Web Share API
 */
export async function shareCalendarImage(elementId) {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Calendar element not found')
    }

    // Generate canvas
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f0f0f',
      scale: 2,
      logging: false,
      useCORS: true
    })

    // Convert to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve))

    // Create file
    const fileName = `runcoach-kalender-${new Date().toISOString().split('T')[0]}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    // Share if supported
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'RunCoach Treningskalender',
        text: 'Min treningskalender fra RunCoach'
      })
      return true
    } else {
      // Fallback to download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
      return false // Indicate fallback was used
    }
  } catch (error) {
    console.error('Failed to share calendar:', error)
    throw error
  }
}
