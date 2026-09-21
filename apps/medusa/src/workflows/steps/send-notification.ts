import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type NotificationInput = {
  to: string
  channel: string
  template: string
  data?: Record<string, unknown>
}

export const sendNotificationStep = createStep(
  "send-notification",
  async (data: NotificationInput[], { container }) => {
    const notificationModuleService = container.resolve(Modules.NOTIFICATION)
    const notification = await notificationModuleService.createNotifications(data)
    return new StepResponse(notification)
  },
)
