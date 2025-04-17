
import { jsPDF } from "jspdf";
import { Room, RoomComponent } from "@/types";
import { pdfStyles } from "../styles";
import { conditionRatingToText } from "../../imageProcessingService";
import { addCompressedImage, checkPageOverflow } from "../utils/helpers";

/**
 * Generate room section with components
 */
export async function generateRoomSection(doc: jsPDF, room: Room, roomIndex: number): Promise<void> {
  const pageWidth = doc.internal.pageSize.width;
  const margins = pdfStyles.margins.page;
  
  // Room header with number
  doc.setFont(pdfStyles.fonts.header, "bold");
  doc.setFontSize(pdfStyles.fontSizes.title);
  doc.setTextColor(pdfStyles.colors.black[0], pdfStyles.colors.black[1], pdfStyles.colors.black[2]);
  doc.text(`${roomIndex}. ${room.name.toUpperCase()}`, margins, margins + 10);
  
  // Underline
  doc.setDrawColor(pdfStyles.colors.black[0], pdfStyles.colors.black[1], pdfStyles.colors.black[2]);
  doc.line(margins, margins + 15, margins + doc.getTextWidth(`${roomIndex}. ${room.name.toUpperCase()}`) + 5, margins + 15);
  
  let yPosition = margins + 30;
  
  // General room condition
  if (room.generalCondition) {
    // Check if we need a page break before adding general condition
    if (checkPageOverflow(doc, yPosition, 20)) {
      doc.addPage();
      yPosition = margins;
      
      // Add room continuation header
      doc.setFont(pdfStyles.fonts.header, "normal");
      doc.setFontSize(pdfStyles.fontSizes.normal);
      doc.text(`${roomIndex}. ${room.name} (continued)`, margins, yPosition);
      yPosition += 15;
    }
    
    doc.setFont(pdfStyles.fonts.body, "bold");
    doc.setFontSize(pdfStyles.fontSizes.normal);
    doc.text("General Condition:", margins, yPosition);
    
    doc.setFont(pdfStyles.fonts.body, "normal");
    const splitCondition = doc.splitTextToSize(room.generalCondition, pageWidth - (margins * 2) - 20);
    
    // Check if the condition text would overflow
    if (checkPageOverflow(doc, yPosition, splitCondition.length * 6 + 10)) {
      doc.addPage();
      yPosition = margins;
      
      // Add room continuation header
      doc.setFont(pdfStyles.fonts.header, "normal");
      doc.setFontSize(pdfStyles.fontSizes.normal);
      doc.text(`${roomIndex}. ${room.name} (continued)`, margins, yPosition);
      yPosition += 15;
      
      // Re-add the "General Condition:" header
      doc.setFont(pdfStyles.fonts.body, "bold");
      doc.setFontSize(pdfStyles.fontSizes.normal);
      doc.text("General Condition:", margins, yPosition);
    }
    
    yPosition += 8;
    doc.setFont(pdfStyles.fonts.body, "normal");
    doc.text(splitCondition, margins, yPosition);
    yPosition += splitCondition.length * 6 + 10;
  }
  
  // Room Images
  if (room.images && room.images.length > 0) {
    // Safety check for empty images array
    const validImages = room.images.filter(img => img && img.url && img.url.trim() !== '');
    
    if (validImages.length > 0) {
      // Check if we need a page break before adding room overview
      if (checkPageOverflow(doc, yPosition, 10)) {
        doc.addPage();
        yPosition = margins;
        
        // Add room continuation header
        doc.setFont(pdfStyles.fonts.header, "normal");
        doc.setFontSize(pdfStyles.fontSizes.normal);
        doc.text(`${roomIndex}. ${room.name} (continued)`, margins, yPosition);
        yPosition += 15;
      }
      
      doc.setFont(pdfStyles.fonts.body, "bold");
      doc.setFontSize(pdfStyles.fontSizes.normal);
      doc.text("Room Overview:", margins, yPosition);
      yPosition += 8;
      
      // Show all room images, not just 4
      const imagesPerRow = 2;
      const imageWidth = (pageWidth - (margins * 2) - 10) / imagesPerRow;
      const imageHeight = 40;
      
      let imageYPosition = yPosition;
      
      for (let i = 0; i < validImages.length; i++) {
        const col = i % imagesPerRow;
        const row = Math.floor(i / imagesPerRow);
        
        // Check if this row of images would overflow into footer
        if (row > 0 && checkPageOverflow(doc, imageYPosition + (row * (imageHeight + 15)), imageHeight)) {
          doc.addPage();
          imageYPosition = margins;
          // Reset row counter but keep column position
          i = (Math.floor(i / imagesPerRow) * imagesPerRow);
          
          // Add room continuation header
          doc.setFont(pdfStyles.fonts.header, "normal");
          doc.setFontSize(pdfStyles.fontSizes.normal);
          doc.text(`${roomIndex}. ${room.name} - Room Overview (continued)`, margins, imageYPosition);
          imageYPosition += 15;
        }
        
        const xPos = margins + (col * (imageWidth + 5));
        const yPos = imageYPosition + (row * (imageHeight + 15));
        
        try {
          await addCompressedImage(
            doc,
            validImages[i].url,
            `room_${room.id}_image_${i}`,
            xPos,
            yPos,
            imageWidth,
            imageHeight,
            validImages[i].timestamp,
            true // maintain aspect ratio
          );
        } catch (error) {
          console.error(`Error adding room image ${i}:`, error);
        }
      }
      
      // Update y position after images, ensure we don't go into footer area
      const rowsUsed = Math.ceil(validImages.length / imagesPerRow);
      yPosition = imageYPosition + (rowsUsed * (imageHeight + 15)) + 10;
    }
  }
  
  // Components
  if (room.components && room.components.length > 0) {
    // Sort components - standard ones first, then custom ones
    const sortedComponents = [...room.components].sort((a, b) => {
      if (a.isCustom && !b.isCustom) return 1;
      if (!a.isCustom && b.isCustom) return -1;
      return a.name.localeCompare(b.name);
    });
    
    // Generate component sections
    for (let i = 0; i < sortedComponents.length; i++) {
      const component = sortedComponents[i];
      
      // Check if we need a new page
      if (checkPageOverflow(doc, yPosition, 20)) {
        doc.addPage();
        yPosition = margins;
        
        // Add room continuation header
        doc.setFont(pdfStyles.fonts.header, "normal");
        doc.setFontSize(pdfStyles.fontSizes.normal);
        doc.text(`${roomIndex}. ${room.name} (continued)`, margins, yPosition);
        yPosition += 15;
      }
      
      // Generate component content
      yPosition = await generateComponentSection(doc, component, roomIndex, i+1, yPosition);
    }
  } else {
    // No components found
    doc.setFont(pdfStyles.fonts.body, "italic");
    doc.setFontSize(pdfStyles.fontSizes.normal);
    doc.text("No components have been added to this room.", margins, yPosition);
    yPosition += 10;
  }

  return Promise.resolve();
}

/**
 * Generate a section for a specific room component
 */
async function generateComponentSection(
  doc: jsPDF, 
  component: RoomComponent, 
  roomIndex: number, 
  componentIndex: number,
  startY: number
): Promise<number> {
  const pageWidth = doc.internal.pageSize.width;
  const margins = pdfStyles.margins.page;
  let yPosition = startY;
  
  // Check if we need a new page for this component
  if (checkPageOverflow(doc, yPosition, 20)) {
    doc.addPage();
    yPosition = margins;
  }
  
  // Section header with component number
  const componentNumber = `${roomIndex}.${componentIndex}`;
  doc.setFont(pdfStyles.fonts.header, "bold");
  doc.setFontSize(pdfStyles.fontSizes.sectionTitle);
  doc.text(`${componentNumber} ${component.name}`, margins, yPosition);
  yPosition += 10;
  
  // Component description
  if (component.description) {
    doc.setFont(pdfStyles.fonts.body, "normal");
    doc.setFontSize(pdfStyles.fontSizes.normal);
    
    const splitDescription = doc.splitTextToSize(component.description, pageWidth - (margins * 2) - 10);
    
    // Check if description would overflow into footer
    if (checkPageOverflow(doc, yPosition, splitDescription.length * 6 + 5)) {
      doc.addPage();
      yPosition = margins;
      
      // Add component continuation header
      doc.setFont(pdfStyles.fonts.header, "normal");
      doc.setFontSize(pdfStyles.fontSizes.normal);
      doc.text(`${roomIndex}.${componentIndex} ${component.name} (continued)`, margins, yPosition);
      yPosition += 10;
    }
    
    doc.text(splitDescription, margins, yPosition);
    yPosition += splitDescription.length * 6 + 5;
  }
  
  // Component condition
  if (component.condition) {
    // Check if adding condition would overflow into footer
    if (checkPageOverflow(doc, yPosition, 10)) {
      doc.addPage();
      yPosition = margins;
      
      // Add component continuation header
      doc.setFont(pdfStyles.fonts.header, "normal");
      doc.setFontSize(pdfStyles.fontSizes.normal);
      doc.text(`${roomIndex}.${componentIndex} ${component.name} (continued)`, margins, yPosition);
      yPosition += 10;
    }
    
    // Fix: Check if condition is a string before calling replace
    let formattedCondition = "Not specified";
    try {
      if (component.condition) {
        formattedCondition = conditionRatingToText(component.condition);
      }
    } catch (error) {
      console.error(`Error formatting condition for component ${component.name}:`, error);
      // Fallback formatting based on condition type
      if (typeof component.condition === 'number') {
        // If it's a number, use a simple rating scale
        const ratings = ["Poor", "Fair", "Average", "Good", "Excellent"];
        const index = Math.min(Math.max(Math.floor(component.condition) - 1, 0), 4);
        formattedCondition = ratings[index];
      } else if (typeof component.condition === 'string') {
        // If it's already a string, use it directly
        formattedCondition = component.condition;
      } else if (typeof component.condition === 'object' && component.condition !== null && 'rating' in component.condition) {
        // If it's an object with a rating property, use that
        formattedCondition = conditionRatingToText(component.condition.rating);
      }
    }
    
    doc.setFont(pdfStyles.fonts.body, "bold");
    doc.text("Condition:", margins, yPosition);
    doc.setFont(pdfStyles.fonts.body, "normal");
    doc.text(formattedCondition, margins + 25, yPosition);
    yPosition += 7;
  }
  
  // Additional condition details
  if (component.conditionSummary) {
    const splitSummary = doc.splitTextToSize(component.conditionSummary, pageWidth - (margins * 2) - 10);
    
    // Check if condition summary would overflow into footer
    if (checkPageOverflow(doc, yPosition, splitSummary.length * 6 + 3)) {
      doc.addPage();
      yPosition = margins;
      
      // Add component continuation header
      doc.setFont(pdfStyles.fonts.header, "normal");
      doc.setFontSize(pdfStyles.fontSizes.normal);
      doc.text(`${roomIndex}.${componentIndex} ${component.name} (continued)`, margins, yPosition);
      yPosition += 10;
    }
    
    doc.text(splitSummary, margins, yPosition);
    yPosition += splitSummary.length * 6 + 3;
  }
  
  // Condition points as bullet points
  if (component.conditionPoints && component.conditionPoints.length > 0) {
    // Check if points would overflow into footer
    if (checkPageOverflow(doc, yPosition, component.conditionPoints.length * 6 + 5)) {
      doc.addPage();
      yPosition = margins;
      
      // Add component continuation header
      doc.setFont(pdfStyles.fonts.header, "normal");
      doc.setFontSize(pdfStyles.fontSizes.normal);
      doc.text(`${roomIndex}.${componentIndex} ${component.name} (continued)`, margins, yPosition);
      yPosition += 10;
    }
    
    yPosition += 2;
    for (const point of component.conditionPoints) {
      if (point.trim()) {
        // Check if this specific point would overflow into footer
        if (checkPageOverflow(doc, yPosition, 6)) {
          doc.addPage();
          yPosition = margins;
          
          // Add component continuation header
          doc.setFont(pdfStyles.fonts.header, "normal");
          doc.setFontSize(pdfStyles.fontSizes.normal);
          doc.text(`${roomIndex}.${componentIndex} ${component.name} - Points (continued)`, margins, yPosition);
          yPosition += 10;
        }
        
        doc.text("• " + point, margins + 5, yPosition);
        yPosition += 6;
      }
    }
    yPosition += 3;
  }
  
  // Component notes
  if (component.notes) {
    // Check if notes header would overflow into footer
    if (checkPageOverflow(doc, yPosition, 10)) {
      doc.addPage();
      yPosition = margins;
      
      // Add component continuation header
      doc.setFont(pdfStyles.fonts.header, "normal");
      doc.setFontSize(pdfStyles.fontSizes.normal);
      doc.text(`${roomIndex}.${componentIndex} ${component.name} (continued)`, margins, yPosition);
      yPosition += 10;
    }
    
    yPosition += 2;
    doc.setFont(pdfStyles.fonts.body, "bold");
    doc.text("Notes:", margins, yPosition);
    yPosition += 6;
    
    doc.setFont(pdfStyles.fonts.body, "normal");
    const splitNotes = doc.splitTextToSize(component.notes, pageWidth - (margins * 2) - 10);
    
    // Check if notes content would overflow into footer
    if (checkPageOverflow(doc, yPosition, splitNotes.length * 6 + 5)) {
      doc.addPage();
      yPosition = margins;
      
      // Add component continuation header
      doc.setFont(pdfStyles.fonts.header, "normal");
      doc.setFontSize(pdfStyles.fontSizes.normal);
      doc.text(`${roomIndex}.${componentIndex} ${component.name} - Notes (continued)`, margins, yPosition);
      yPosition += 10;
    }
    
    doc.text(splitNotes, margins + 5, yPosition);
    yPosition += splitNotes.length * 6 + 5;
  }
  
  // Component images - show all images in a standardized format
  if (component.images && component.images.length > 0) {
    // Filter out any invalid images
    const validImages = component.images.filter(img => img && img.url && img.url.trim() !== '');
    
    if (validImages.length > 0) {
      // Check if adding images would overflow into footer
      if (checkPageOverflow(doc, yPosition, 15)) {  // Header space
        doc.addPage();
        yPosition = margins;
        
        // Add component continuation header
        doc.setFont(pdfStyles.fonts.header, "normal");
        doc.setFontSize(pdfStyles.fontSizes.normal);
        doc.text(`${roomIndex}.${componentIndex} ${component.name} - Images`, margins, yPosition);
        yPosition += 10;
      }
      
      // Standard image sizes - display in a grid from left to right
      const imagesPerRow = 2; // Reduced from 3 to 2 to make them larger and more visible
      const imageWidth = (pageWidth - (margins * 2) - ((imagesPerRow - 1) * 5)) / imagesPerRow;
      const imageHeight = 40; // Standardized height for all images
      
      let currentY = yPosition;
      
      for (let j = 0; j < validImages.length; j++) {
        const col = j % imagesPerRow;
        const row = Math.floor(j / imagesPerRow);
        
        // Check if starting a new row would overflow into footer
        if (col === 0 && row > 0 && checkPageOverflow(doc, currentY + (imageHeight + 15), imageHeight)) {
          doc.addPage();
          currentY = margins;
          
          // Add component continuation header
          doc.setFont(pdfStyles.fonts.header, "normal");
          doc.setFontSize(pdfStyles.fontSizes.normal);
          doc.text(`${roomIndex}.${componentIndex} ${component.name} - Images (continued)`, margins, currentY);
          currentY += 15;
        }
        
        const xPos = margins + (col * (imageWidth + 5));
        const yPos = currentY + (row * (imageHeight + 15));
        
        try {
          await addCompressedImage(
            doc,
            validImages[j].url,
            `component_${component.id}_image_${j}`,
            xPos,
            yPos,
            imageWidth,
            imageHeight,
            validImages[j].timestamp,
            true // maintain aspect ratio
          );
        } catch (error) {
          console.error(`Error adding component image ${j}:`, error);
        }
      }
      
      // Update y position after images
      const rowsUsed = Math.ceil(validImages.length / imagesPerRow);
      yPosition = currentY + (rowsUsed * (imageHeight + 15)) + 5;
    }
  }
  
  return yPosition;
}
