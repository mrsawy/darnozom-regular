import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { Resend, type CreateEmailOptions } from "resend"
import { orderPlacedEmailHtml } from "./emails/order-placed"
import { userInvitedEmailHtml } from "./emails/user-invited"
import { passwordResetEmailHtml } from "./emails/password-reset"

enum Templates {
  ORDER_PLACED = "order-placed",
  USER_INVITED = "user-invited",
  PASSWORD_RESET = "password-reset",
}

const templates: {
  [key in Templates]?: (props: Record<string, unknown>) => string
} = {
  [Templates.ORDER_PLACED]: orderPlacedEmailHtml,
  [Templates.USER_INVITED]: userInvitedEmailHtml,
  [Templates.PASSWORD_RESET]: passwordResetEmailHtml,
}

type ResendOptions = {
  api_key: string
  from: string
  html_templates?: Record<
    string,
    {
      subject?: string
      content: string
    }
  >
}

type InjectedDependencies = {
  logger: Logger
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"
  private resendClient: Resend
  private options: ResendOptions
  private logger: Logger

  constructor({ logger }: InjectedDependencies, options: ResendOptions) {
    super()
    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `api_key` is required in the provider's options.",
      )
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `from` is required in the provider's options.",
      )
    }
  }

  getTemplate(template: Templates) {
    if (this.options.html_templates?.[template]) {
      return this.options.html_templates[template].content
    }
    const allowedTemplates = Object.keys(templates)
    if (!allowedTemplates.includes(template)) {
      return null
    }
    return templates[template]
  }

  getTemplateSubject(template: Templates) {
    if (this.options.html_templates?.[template]?.subject) {
      return this.options.html_templates[template].subject
    }
    switch (template) {
      case Templates.ORDER_PLACED:
        return "تأكيد الطلب — دار النظم"
      case Templates.USER_INVITED:
        return "دعوة للانضمام إلى لوحة دار النظم"
      case Templates.PASSWORD_RESET:
        return "إعادة تعيين كلمة المرور"
      default:
        return "دار النظم"
    }
  }

  async send(
    notification: ProviderSendNotificationDTO,
  ): Promise<ProviderSendNotificationResultsDTO> {
    const template = this.getTemplate(notification.template as Templates)

    if (!template) {
      this.logger.error(
        `Couldn't find an email template for ${notification.template}. Valid options: ${Object.values(Templates).join(", ")}`,
      )
      return {}
    }

    const commonOptions = {
      from: this.options.from,
      to: [notification.to],
      subject: this.getTemplateSubject(notification.template as Templates),
    }

    let emailOptions: CreateEmailOptions
    if (typeof template === "string") {
      emailOptions = {
        ...commonOptions,
        html: template,
      }
    } else {
      emailOptions = {
        ...commonOptions,
        html: template((notification.data ?? {}) as Record<string, unknown>),
      }
    }

    const { data, error } = await this.resendClient.emails.send(emailOptions)

    if (error || !data) {
      if (error) {
        this.logger.error("Failed to send email", error)
      } else {
        this.logger.error("Failed to send email: unknown error")
      }
      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService
