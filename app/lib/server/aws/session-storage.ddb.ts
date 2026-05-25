import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Session } from "@shopify/shopify-api";
import type { SessionStorage } from "@shopify/shopify-app-session-storage";

import { getAwsRegion, getDynamoTableName } from "../env";

function docClient() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region: getAwsRegion() }), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

function sessionPk(id: string) {
  return `SESSION#${id}`;
}

export class DynamoDbSessionStorage implements SessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    const doc = docClient();
    await doc.send(
      new PutCommand({
        TableName: getDynamoTableName(),
        Item: {
          PK: sessionPk(session.id),
          SK: "META",
          entity: "shopify_session",
          id: session.id,
          shop: session.shop,
          payload: session.toObject(),
        },
      })
    );
    return true;
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const doc = docClient();
    const res = await doc.send(
      new GetCommand({
        TableName: getDynamoTableName(),
        Key: { PK: sessionPk(id), SK: "META" },
      })
    );
    if (!res.Item?.payload) return undefined;
    return new Session(res.Item.payload as ConstructorParameters<typeof Session>[0]);
  }

  async deleteSession(id: string): Promise<boolean> {
    const doc = docClient();
    await doc.send(
      new DeleteCommand({
        TableName: getDynamoTableName(),
        Key: { PK: sessionPk(id), SK: "META" },
      })
    );
    return true;
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    await Promise.all(ids.map((id) => this.deleteSession(id)));
    return true;
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const doc = docClient();
    const res = await doc.send(
      new ScanCommand({
        TableName: getDynamoTableName(),
        FilterExpression: "#e = :entity AND #shop = :shop",
        ExpressionAttributeNames: { "#e": "entity", "#shop": "shop" },
        ExpressionAttributeValues: {
          ":entity": "shopify_session",
          ":shop": shop,
        },
      })
    );
    return (res.Items ?? [])
      .map((item) => {
        if (!item.payload) return null;
        return new Session(item.payload as ConstructorParameters<typeof Session>[0]);
      })
      .filter((s): s is Session => s !== null);
  }
}
