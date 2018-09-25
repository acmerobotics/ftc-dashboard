package org.firstinspires.ftc.teamcode;

import android.graphics.Bitmap;

import com.acmerobotics.dashboard.FtcDashboard;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.vuforia.Image;
import com.vuforia.PIXEL_FORMAT;
import com.vuforia.Vuforia;

import org.firstinspires.ftc.robotcore.external.ClassFactory;
import org.firstinspires.ftc.robotcore.external.navigation.VuforiaLocalizer;

import java.nio.ByteBuffer;
import java.util.concurrent.BlockingQueue;

@TeleOp
public class VuforiaStreamExampleOpMode extends LinearOpMode {

    public static final String VUFORIA_LICENSE_KEY = "YOUR VUFORIA KEY";

    @Override
    public void runOpMode() throws InterruptedException {
        msStuckDetectStop = 2500;

        FtcDashboard dashboard = FtcDashboard.getInstance();

        VuforiaLocalizer.Parameters vuforiaParams = new VuforiaLocalizer.Parameters(R.id.cameraMonitorViewId);
        vuforiaParams.vuforiaLicenseKey = VUFORIA_LICENSE_KEY;
        vuforiaParams.cameraDirection = VuforiaLocalizer.CameraDirection.BACK;
        VuforiaLocalizer vuforia = ClassFactory.getInstance().createVuforia(vuforiaParams);

        Vuforia.setFrameFormat(PIXEL_FORMAT.RGB565, true);
        vuforia.setFrameQueueCapacity(1);

        BlockingQueue<VuforiaLocalizer.CloseableFrame> frameQueue = vuforia.getFrameQueue();

        waitForStart();

        while (opModeIsActive()) {
            if (!frameQueue.isEmpty()) {
                long start = System.nanoTime();

                VuforiaLocalizer.CloseableFrame vuforiaFrame = null;
                try {
                    vuforiaFrame = frameQueue.take();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }

                if (vuforiaFrame == null) {
                    continue;
                }

                for (int i = 0; i < vuforiaFrame.getNumImages(); i++) {
                    Image image = vuforiaFrame.getImage(i);
                    if (image.getFormat() == PIXEL_FORMAT.RGB565) {
                        int imageWidth = image.getWidth(), imageHeight = image.getHeight();
                        ByteBuffer byteBuffer = image.getPixels();
                        Bitmap bitmap = Bitmap.createBitmap(imageWidth, imageHeight, Bitmap.Config.RGB_565);
                        bitmap.copyPixelsFromBuffer(byteBuffer);
                        dashboard.sendImage(bitmap);
                    }
                }
                vuforiaFrame.close();

                long ms = (System.nanoTime() - start) / 1_000_000;
                long sleepTime = 250 - ms;
                if (sleepTime > 0) {
                    Thread.sleep(sleepTime);
                }
            } else {
                try {
                    Thread.sleep(1);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }
    }
}