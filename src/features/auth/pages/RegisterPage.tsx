import { useRegister } from '@/api/generated/endpoints/auth'
import type { RegisterRequest } from '@/api/generated/models'
import { useNavigate } from '@tanstack/react-router'
import { App, Button, Form, Input } from 'antd'
import { Lock, Mail, ShieldCheck } from 'lucide-react'

export function RegisterPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm<RegisterRequest>()
  const registerMutation = useRegister()

  const handleFinish = async (values: RegisterRequest) => {
    try {
      await registerMutation.mutateAsync({ data: values })
      message.success('注册成功，请登录')
      void navigate({ to: '/auth/login' })
    } catch (error: any) {
      message.error(error.message)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      size="large"
      colon={false}
      requiredMark={false}
      scrollToFirstError
      onFinish={(values) => void handleFinish(values)}
      className="flex h-full w-full flex-col [&_.ant-form-item]:mb-5"
    >
      <Form.Item
        name="account"
        label="邮箱"
        validateFirst
        rules={[
          { required: true, message: '请输入邮箱' },
          {
            type: 'email',
            message: '请输入有效的邮箱地址',
          },
          {
            max: 64,
            message: '邮箱长度不能超过64个字符',
          },
        ]}
      >
        <Input
          prefix={<Mail />}
          placeholder="请输入邮箱地址"
          autoComplete="email"
          maxLength={64}
          className="h-11 rounded-lg"
        />
      </Form.Item>

      <Form.Item
        name="password"
        validateFirst
        rules={[
          { required: true, message: '请设置密码' },
          {
            min: 6,
            message: '密码长度不能少于6位',
          },
        ]}
      >
        <Input.Password
          prefix={<Lock />}
          placeholder="请设置密码"
          autoComplete="new-password"
          maxLength={255}
          className="h-11 rounded-lg"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          { required: true, message: '请再次输入密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve()
              }

              return Promise.reject(new Error('两次输入的密码不一致'))
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<ShieldCheck />}
          placeholder="请再次输入密码"
          autoComplete="new-password"
          maxLength={255}
          className="h-11 rounded-lg"
        />
      </Form.Item>

      <div className="mt-6">
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={registerMutation.isPending}
          className="h-11 rounded-lg font-medium shadow-none"
        >
          注册
        </Button>
      </div>
    </Form>
  )
}
