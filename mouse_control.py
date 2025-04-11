from digi.xbee.devices import XBeeDevice
import time
import pyautogui

matt = XBeeDevice("COM4", 115200)
matt.open()
matt.send_data_broadcast(1)
'''
pitchAngle = 45
yawAngle = 45

screenWidth, screenHeight = pyautogui.size()
centerX = screenWidth/2
centerY = screenHeight/2
print(centerX, centerY)
tolerance = 5


def convertTwosComplementToNegative(twosCompNum):
    return ((twosCompNum-4294967295) - 1)


def parsePitchAndYaw(data):
    return int.from_bytes(data[5:9], "big"), int.from_bytes(data[1:5], "big")

# (pitch,yaw) = (0,0) needs to map to center of screen. 
# Calibration step: User will move keep moving IMU until they are at (0,0). Here that gets mapped to center of screen.
# Demo idea (Prof Smith suggestion): fancy calibration with continuously changing arrows to indicate (0,0)
def calibrateMouseWithIMU():
    count = 0
    while True:
        messageFromSTM32 = matt.read_data()
        if messageFromSTM32 is not None:
            data = messageFromSTM32.data
            assert(data[0] == 0)

            pitch, yaw = parsePitchAndYaw(data)
            if (pitch > 180): # negative
                pitch = convertTwosComplementToNegative(pitch)
            count += 1
            
            print("count: " + str(count))
            print("pitch: ") 
            print(pitch)
            print("yaw: ")
            print(yaw)
            
            if abs(pitch) < tolerance and (yaw < tolerance or (360-yaw) < tolerance) : #approximately 0
                pyautogui.moveTo(centerX, centerY)
                break


# Range of vals will be pitch = -pitchAngle to +pitchAngle, yaw = (360-yawAngle) to +yawAngle
def moveMouse(pitch, yaw):
    print("pitch: " + str(pitch) + ", yaw " + str(yaw))
    y = centerY + pitch*(centerY/pitchAngle) # -pitchAngle => bottom edge, +pitchAngle => top edge

    if (yaw > 360-yawAngle):
        x = ((yaw - 360)*(centerX/yawAngle)) + centerX
    else:
        x = centerX + yaw*(centerX/yawAngle)

    print("x coord: " + str(x) + ", y coord: " + str(y))
    #if pyautogui.onScreen(x, y):
        #pyautogui.moveTo(x, y)


def parseMessageFromSTM32(data):
    print(data[0])
    click = (data[0] == 1)
    if click:
       pyautogui.click()
    else:
        yaw = data[1:5]
        pitch = data[5:9]
        moveMouse(pitch, yaw)

#calibrateMouseWithIMU() 
while True:
    messageFromSTM32 = matt.read_data()
    if messageFromSTM32 is not None:
        data = messageFromSTM32.data
        print(data)
        click = (data[0] == 1)
        if click:
            print("click")
            pyautogui.click() 
        
        else:
            print("move")
            pitch, yaw = parsePitchAndYaw(data)
            moveMouse(pitch, yaw)
'''        

matt.close()
