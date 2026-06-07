import { useLogin } from '@/api/generated/endpoints/auth'
import type { LoginRequest } from '@/api/generated/models'
import type { UserVO } from '@/api/generated/models'
import { useAuthSessionStore } from '@/stores/auth-session'
import { useNavigate } from '@tanstack/react-router'
import { App, Button, Form, Input } from 'antd'
import { Lock, User } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm<LoginRequest>()
  const setSession = useAuthSessionStore((state) => state.setSession)
  const loginMutation = useLogin()

  const handleFinish = async (values: LoginRequest) => {
    try {
      const response = await loginMutation.mutateAsync({ data: values })
      const loginData = response.data as { accessToken: string; userVO: UserVO }
      setSession({
        accessToken: loginData.accessToken,
        user: loginData.userVO,
      })
      message.success('登录成功')
      void navigate({ to: '/' })
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
      className="flex h-full w-full flex-col [&_.ant-form-item]:mb-5 max-md:[&_.ant-input]:pb-[13px]"
    >
      <Form.Item
        name="account"
        validateFirst
        rules={[{ required: true, message: '请输入账号' }]}
      >
        <Input
          prefix={<User />}
          placeholder="请输入账号"
          autoComplete="username"
          className="h-11 rounded-lg"
        />
      </Form.Item>

      <Form.Item
        name="password"
        validateFirst
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password
          prefix={<Lock />}
          placeholder="请输入密码"
          autoComplete="current-password"
          className="h-11 rounded-lg"
        />
      </Form.Item>

      <div className="mt-6">
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={loginMutation.isPending}
          className="h-11 rounded-lg font-medium shadow-none"
        >
          登录
        </Button>
      </div>
    </Form>
  )
}
