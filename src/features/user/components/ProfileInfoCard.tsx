import type { ProfileInfo } from '@/features/user/types'
import { Avatar, Button, Card, Descriptions, Typography } from 'antd'
import { Camera, PencilLine } from 'lucide-react'

const { Text, Title } = Typography

export function ProfileInfoCard({
  profile,
  onOpenAvatarPicker,
  onOpenEditDrawer,
}: {
  profile: ProfileInfo
  onOpenAvatarPicker: () => void
  onOpenEditDrawer: () => void
}) {
  const profileDisplayName = profile.nickname?.trim() || '未设置'
  const profileDisplayInitial = profile.nickname?.trim().slice(0, 1).toUpperCase()

  return (
    <Card className="rounded-3xl border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] [&_.ant-card-body]:p-5 sm:[&_.ant-card-body]:p-8">
      {/* 移动端：头像居中 + 信息垂直排列 */}
      <div className="flex flex-col gap-5 sm:flex sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        {/* 头像区 */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
          <button
            type="button"
            onClick={onOpenAvatarPicker}
            aria-label="更换头像"
            aria-haspopup="dialog"
            className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"
          >
            <Avatar
              size={72}
              src={profile.avatar}
              className="bg-slate-100! size-[72px] sm:size-[80px] ring-2 ring-white transition-transform duration-200 group-hover:scale-[1.02] group-focus-visible:scale-[1.02]"
            >
              {profileDisplayInitial}
            </Avatar>
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-full bg-slate-950/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
              <Camera className="mb-1 size-5 text-white" />
              <span className="text-[11px] font-medium tracking-[0.08em] text-white">
                更换头像
              </span>
            </span>
          </button>

          {/* 用户名 + 账号 */}
          <div className="min-w-0 text-center sm:text-left">
            <Title
              level={3}
              className="m-0! text-lg! leading-snug! break-words sm:text-xl!"
            >
              {profileDisplayName}
            </Title>
            <Text className="mt-1 block truncate text-xs text-slate-400 sm:text-sm">
              账号：{profile.account || '未设置'}
            </Text>
          </div>
        </div>

        {/* 编辑按钮 */}
        <Button
          icon={<PencilLine className="size-4" />}
          onClick={onOpenEditDrawer}
          className="shrink-0 self-center rounded-full border-sky-300 bg-white px-4 font-medium text-slate-800 shadow-none transition-[background-color,border-color,box-shadow,color] hover:border-sky-400 hover:bg-sky-50/40 hover:text-sky-700 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
        >
          编辑用户信息
        </Button>
      </div>

      {/* 详细信息列表 */}
      <Descriptions
        column={{ xs: 1, md: 2 }}
        className="mt-5 [&_.ant-descriptions-item-label]:min-w-20 [&_.ant-descriptions-item-label]:w-auto [&_.ant-descriptions-item-label]:text-slate-500 [&_.ant-descriptions-item-content]:text-slate-800 [&_.ant-descriptions-item-content]:break-all"
        items={[
          {
            key: 'id',
            label: '用户 ID',
            children: profile.id || '未设置',
          },
          {
            key: 'role',
            label: '角色标识',
            children: profile.roleText || '未设置',
          },
          {
            key: 'nickname',
            label: '昵称',
            children: profile.nickname || '未设置',
          },
          {
            key: 'createTime',
            label: '创建时间',
            children: profile.createTime || '未设置',
          },
          {
            key: 'profile',
            label: '个人简介',
            children: profile.profile || '未设置',
            span: 2,
          },
        ]}
      />
    </Card>
  )
}
