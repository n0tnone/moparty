import Avatar from 'boring-avatars'

export default function UserAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <Avatar
      size={size}
      name={name}
      variant="beam"
      colors={['#090b10', '#1a1f2e', '#5b8fff', '#7aabff', '#a78bfa']}
      square={true}
    />
  )
}