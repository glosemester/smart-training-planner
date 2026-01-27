import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'

/**
 * Exports training plan to PDF
 * @param {Object} plan - Training plan with sessions
 * @param {String} weekStart - Week start date
 * @returns {void}
 */
export async function exportPlanToPDF(plan, weekStart) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let yPos = margin

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  // Header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Treningsplan', margin, yPos)
  yPos += 10

  // Week info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  const weekDate = new Date(weekStart)
  doc.text(`Uke ${plan.weekNumber || ''} - ${format(weekDate, 'd. MMMM yyyy', { locale: nb })}`, margin, yPos)
  yPos += 15

  // Week summary if available
  if (plan.weeklyGoal) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Ukes mål:', margin, yPos)
    yPos += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const goalLines = doc.splitTextToSize(plan.weeklyGoal, contentWidth)
    goalLines.forEach(line => {
      checkPageBreak(7)
      doc.text(line, margin, yPos)
      yPos += 5
    })
    yPos += 10
  }

  // Total load
  if (plan.totalLoad) {
    checkPageBreak(20)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Total belastning:', margin, yPos)
    yPos += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    if (plan.totalLoad.running_km) {
      doc.text(`Løping: ${plan.totalLoad.running_km} km`, margin + 5, yPos)
      yPos += 6
    }
    if (plan.totalLoad.strength_sessions) {
      doc.text(`Styrkeøkter: ${plan.totalLoad.strength_sessions}`, margin + 5, yPos)
      yPos += 6
    }
    yPos += 8
  }

  // Days and sessions
  const dayNames = {
    monday: 'Mandag',
    tuesday: 'Tirsdag',
    wednesday: 'Onsdag',
    thursday: 'Torsdag',
    friday: 'Fredag',
    saturday: 'Lørdag',
    sunday: 'Søndag'
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  days.forEach(day => {
    const sessions = (plan.sessions || []).filter(s => s.day === day)

    if (sessions.length > 0) {
      checkPageBreak(40)

      // Day header
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, yPos - 5, contentWidth, 10, 'F')
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(dayNames[day], margin + 2, yPos)
      yPos += 10

      // Sessions for this day
      sessions.forEach(session => {
        checkPageBreak(50)

        // Session title
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(session.title || 'Økt', margin + 5, yPos)
        yPos += 7

        // Session details
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')

        // Duration and distance
        let detailsText = `${session.duration_minutes || 0} minutter`
        if (session.details?.distance_km) {
          detailsText += ` • ${session.details.distance_km} km`
        }
        doc.text(detailsText, margin + 5, yPos)
        yPos += 6

        // Description
        if (session.description) {
          const descLines = doc.splitTextToSize(session.description, contentWidth - 10)
          descLines.forEach(line => {
            checkPageBreak(5)
            doc.text(line, margin + 5, yPos)
            yPos += 5
          })
        }

        yPos += 8
      })

      yPos += 5
    }
  })

  // Tips at the end
  if (plan.weeklyTips && plan.weeklyTips.length > 0) {
    checkPageBreak(40)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Tips for uken:', margin, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    plan.weeklyTips.forEach(tip => {
      checkPageBreak(10)
      const tipLines = doc.splitTextToSize(`• ${tip}`, contentWidth - 5)
      tipLines.forEach(line => {
        doc.text(line, margin + 2, yPos)
        yPos += 5
      })
      yPos += 2
    })
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.text(
      `Generert av RunCoach - Side ${i} av ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Save
  const fileName = `treningsplan-uke-${plan.weekNumber || format(new Date(), 'ww')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(fileName)
}
