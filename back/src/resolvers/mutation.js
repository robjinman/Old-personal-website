const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { APP_SECRET, ADMIN_USER, getUserId } = require('../utils')

async function signup(parent, args, context, info) {
  const exists = await context.prisma.$exists.user({
    name: args.name
  })

  if (exists) {
    throw new Error('User already exists')
  }

  const pwHash = await bcrypt.hash(args.password, 10)
  const user = await context.prisma.createUser({
    name: args.name,
    email: args.email,
    pwHash: pwHash,
  })
  const token = jwt.sign({ userId: user.id }, APP_SECRET)

  return {
    token,
    user
  }
}

async function login(parent, args, context, info) {
  const user = await context.prisma.user({ email: args.email })
  if (!user) {
    throw new Error('No such user found')
  }

  const valid = await bcrypt.compare(args.password, user.pwHash)
  if (!valid) {
    throw new Error('Invalid password')
  }

  const token = jwt.sign({ userId: user.id }, APP_SECRET)

  return {
    token,
    user
  }
}

async function postArticle(parent, args, context, info) {
  const userId = getUserId(context)
  const user = await context.prisma.user({ id: userId })

  if (user.name != ADMIN_USER) {
    throw new Error('Not authorized')
  }

  return context.prisma.createArticle({
    title: args.title,
    summary: args.summary,
    content: args.content,
    tags: { set: args.tags },
  })
}

async function postComment(parent, args, context, info) {
  const userId = getUserId(context)

  const user = await context.prisma.user({ id: userId })

  if (user.name != ADMIN_USER) {
    throw new Error('Not authorized')
  }

  return context.prisma.createComment({
    content: args.content,
    user: { connect: { id: userId } },
    article: { connect: { id: args.articleId } },
  })
}

module.exports = {
  signup,
  login,
  postArticle,
  postComment,
}
