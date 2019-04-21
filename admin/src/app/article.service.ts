import { Injectable } from '@angular/core';
import { Query, Mutation, Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import gql from 'graphql-tag';

import { Article, Comment } from './types'
import { LoggingService } from './logging.service';

export interface GetArticleResponse {
  article: Article;
}

@Injectable({
  providedIn: 'root'
})
export class GetArticleGql extends Query<GetArticleResponse> {
  document = gql`
    query article($id: ID!) {
      article(id: $id) {
        id
        draft
        createdAt
        modifiedAt
        publishedAt
        title
        summary
        content
        tags
        files {
          id
          name
          extension
        }
        comments {
          id
        }
      }
    }
  `;
}

interface GetArticlesResponse {
  allArticles: Article[];
}

@Injectable({
  providedIn: 'root'
})
class GetAllArticlesGql extends Query<GetArticlesResponse> {
  document = gql`
    query {
      allArticles {
        id
        draft
        createdAt
        modifiedAt
        publishedAt
        title
        summary
        tags
        comments {
          id
        }
      }
    }
  `;
}

interface GetCommentsResponse {
  comments: Comment[];
}

@Injectable({
  providedIn: 'root'
})
class GetCommentsGql extends Query<GetCommentsResponse> {
  document = gql`
    query {
      comments {
        id
        createdAt
        content
        article {
          id
          title
        }
        user {
          id
          name
        }
      }
    }
  `;
}

@Injectable({
  providedIn: 'root'
})
class DeleteCommentGql extends Mutation {
  document = gql`
    mutation deleteComment($id: ID!) {
      deleteComment(
        id: $id
      ) {
        id
      }
    }
  `;
}

@Injectable({
  providedIn: 'root'
})
class UpdateArticleGql extends Mutation {
  document = gql`
    mutation updateArticle($id: ID!,
                           $title: String!,
                           $summary: String!,
                           $content: String!,
                           $tags: [String!]!) {
      updateArticle(
        id: $id
        title: $title
        summary: $summary
        content: $content
        tags: $tags
      ) {
        id
        draft
        modifiedAt
        title
        summary
        content
        tags
      }
    }
  `;
}

@Injectable({
  providedIn: 'root'
})
class PostArticleGql extends Mutation {
  document = gql`
    mutation postArticle($title: String!,
                         $summary: String!,
                         $content: String!,
                         $tags: [String!]!) {
      postArticle(
        title: $title
        summary: $summary
        content: $content
        tags: $tags
      ) {
        id
        draft
        modifiedAt
        title
        summary
        content
        tags
      }
    }
  `;
}

@Injectable({
  providedIn: 'root'
})
class PublishArticleGql extends Mutation {
  document = gql`
    mutation publishArticle($id: ID!,
                            $publish: Boolean!) {
      publishArticle(
        id: $id
        publish: $publish
      ) {
        id
        draft
        publishedAt
      }
    }
  `;
}

@Injectable({
  providedIn: 'root'
})
class DeleteArticleGql extends Mutation {
  document = gql`
    mutation deleteArticle($id: ID!) {
      deleteArticle(
        id: $id
      ) {
        id
      }
    }
  `;
}

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  constructor(private apollo: Apollo,
              private logger: LoggingService,
              private getArticleGql: GetArticleGql,
              private getArticlesGql: GetAllArticlesGql,
              private getCommentsGql: GetCommentsGql,
              private postArticleGql: PostArticleGql,
              private updateArticleGql: UpdateArticleGql,
              private publishArticleGql: PublishArticleGql,
              private deleteArticleGql: DeleteArticleGql,
              private deleteCommentGql: DeleteCommentGql) {}

  getArticle(id: string): Observable<Article> {
    return this.getArticleGql.watch({id: id})
      .valueChanges
      .pipe(
        map(result => result.data.article),
        tap(() => {
          this.logger.add(`Fetched article, id=${id}`);
        }, () => {
          this.logger.add(`Failed to fetch article, id=${id}`);
        })
      );
  }

  getArticles(): Observable<Article[]> {
    return this.getArticlesGql.watch()
      .valueChanges
      .pipe(
        map(result => result.data.allArticles),
        tap(() => {
          this.logger.add('Fetched articles');
        }, () => {
          this.logger.add('Failed to fetch articles');
        })
      );
  }

  getComments(): Observable<Comment[]> {
    return this.getCommentsGql.watch()
      .valueChanges
      .pipe(
        map(result => result.data.comments),
        tap(() => {
          this.logger.add('Fetched comments');
        }, () => {
          this.logger.add('Failed to fetch comments');
        })
      );
  }

  postArticle(article: Article): Observable<Article> {
    return this.apollo.mutate({
      mutation: this.postArticleGql.document,
      variables: {
        title: article.title,
        summary: article.summary,
        content: article.content,
        tags: article.tags
      },
      refetchQueries: [{
        query: this.getArticlesGql.document
      }]
    })
    .pipe(
      map(result => result.data.postArticle),
      tap(result => {
        const article = result.data.postArticle;
        this.logger.add(`Created article, id=${article.id}`);
      }, () => {
        this.logger.add('Failed to create article');
      })
    );
  }

  updateArticle(article: Article): Observable<Article> {
    return this.updateArticleGql.mutate({
      id: article.id,
      title: article.title,
      summary: article.summary,
      content: article.content,
      tags: article.tags
    })
    .pipe(
      map(result => result.data.updateArticle),
      tap(() => {
        this.logger.add(`Saved article, id=${article.id}`);
      }, () => {
        this.logger.add(`Failed to save article, id=${article.id}`);
      })
    );
  }

  publishArticle(id: string, publish: boolean): Observable<Article> {
    return this.publishArticleGql.mutate({
      id,
      publish
    })
    .pipe(
      map(result => result.data.publishArticle),
      tap(() => {
        const verb = publish ? 'Published' : 'Unpublished';
        this.logger.add(`${verb} article, id=${id}`);
      }, () => {
        const verb = publish ? 'Publish' : 'Unpublish';
        this.logger.add(`Failed to ${verb} article, id=${id}`);
      })
    );
  }

  deleteArticle(id: string): Observable<Article> {
    return this.apollo.mutate({
      mutation: this.deleteArticleGql.document,
      variables: { id },
      refetchQueries: [{
        query: this.getArticlesGql.document
      }]
    })
    .pipe(
      map(result => result.data.deleteArticle),
      tap(() => {
        this.logger.add(`Deleted article, id=${id}`);
      }, () => {
        this.logger.add(`Failed to delete article, id=${id}`);
      })
    );
  }

  deleteComment(id: string): Observable<Article> {
    return this.apollo.mutate({
      mutation: this.deleteCommentGql.document,
      variables: { id },
      refetchQueries: [{
        query: this.getCommentsGql.document
      }]
    })
    .pipe(
      map(result => result.data.deleteComment),
      tap(() => {
        this.logger.add(`Deleted comment, id=${id}`);
      }, () => {
        this.logger.add(`Failed to delete comment, id=${id}`);
      })
    );
  }
}
