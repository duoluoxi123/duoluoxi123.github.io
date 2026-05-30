# -*- coding: utf-8 -*-
import sys
import psycopg2

CONN = dict(host="127.0.0.1", port=5431, user="postgres", password="123456", dbname="postgres")

def main():
    try:
        conn = psycopg2.connect(connect_timeout=8, **CONN)
    except Exception as e:
        print("连接失败:", repr(e))
        sys.exit(2)

    conn.autocommit = True
    cur = conn.cursor()

    # 服务器版本
    cur.execute("SHOW server_version;")
    ver = cur.fetchone()[0]
    print("PostgreSQL 服务器版本:", ver)
    print("=" * 60)

    # 列出所有数据库及其属性
    cur.execute("""
        SELECT d.datname,
               pg_catalog.pg_get_userbyid(d.datdba) AS owner,
               pg_catalog.pg_encoding_to_char(d.encoding) AS encoding,
               d.datistemplate,
               d.datallowconn,
               pg_catalog.pg_size_pretty(pg_catalog.pg_database_size(d.datname)) AS size
        FROM pg_catalog.pg_database d
        ORDER BY d.datname;
    """)
    rows = cur.fetchall()
    print("共 %d 个数据库:" % len(rows))
    print("")
    header = ("数据库名", "属主", "编码", "模板库", "可连接", "大小")
    print("{:<22} {:<12} {:<10} {:<7} {:<7} {:<10}".format(*header))
    print("-" * 75)
    for name, owner, enc, istpl, allowconn, size in rows:
        print("{:<22} {:<12} {:<10} {:<7} {:<7} {:<10}".format(
            name, owner, enc, "是" if istpl else "否", "是" if allowconn else "否", size))

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
